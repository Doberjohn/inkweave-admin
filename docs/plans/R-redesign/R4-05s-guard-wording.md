> **Re-base notes (R4-5s, 2026-10-07).** This task is new: the 2026-10-01 outline has no R4-5s. The outline planned a `useUnsavedGuard` with `window.confirm` in R4-6 (`R4-card-studio.md:842`, `:876-880`). R2-5a's hand-off (`R2-05a-unsaved-guard.md:678-693`) and the audit (`r4-audit-synth.md:49`, `:76`, `:236`) drop it for R2's one `UnsavedChangesGuard`. Decision R-58 settles the wording:
> - `message` may also be `(to: Location) => string`, fed by the held `blocker.location`;
> - R2's in-flight line (`CalibrationPage.tsx:19-20`, F13) moves into a shared helper.
>
> Written against `main @ e5e5029` (branch `feature/24-redesign-r4`) and pin `upstream/inkweave` @ `16283a13`. Every Before block quotes that tree. Its `src/` is the same as `b490fb7`'s: the bump touches only `package.json`, `pnpm-lock.yaml` and the submodule. The names follow the re-based header's contract addition 4 (`scratchpad/r4-rebase/R4-card-studio.md:106-127`): `writeInFlight.ts`, `writeInFlightMessage({action})` and the private `messageFor`.
> - **What changes, and why.**
>   - **The hook gains `to: Location | null`.** It says where the held navigation goes.
>     - It is non-null exactly when `blocked` is true. So it is null in the render where the edits clear, as `blocked` is.
>     - A pure `heldTarget(blocker)` computes it. Inline, it took `useUnsavedChangesGuard` to cyclomatic complexity 9 (local CodeScene 9.68). With the helper, the hook stays at 8 (10.0).
>   - **The guard's `message` widens to `UnsavedMessage = string | ((to: Location) => string)`.**
>     - The change is additive: /calibration keeps its string.
>     - A private `messageFor` calls the function only while a navigation is held.
>   - **The dialog keeps the words it showed while it fades out.** This is new, and the function form needs it.
>     - DialogShell keeps a closed dialog mounted through its exit transition: `useTransitionPresence`, with a 400 ms fallback (`DialogShell.tsx:21`, `:171`).
>     - Once the hold ends there is no target, so a worded line would go blank in the fading panel.
>     - A private `useWordsShown` follows `message` while the dialog is open, and holds the last words while it is closed.
>     - It also fixes a flash on /calibration. A publish that lands mid-question clears the edits and ends `publishing` in one render (`useTuningAdmin.ts:131`, `:138`). The fading panel then read "Your pending tuning edits aren't published yet". It now keeps the in-flight line.
>   - **The shared helper is `writeInFlightMessage({action: 'publish' | 'save'})`, in `src/shell/writeInFlight.ts`.**
>     - It returns R2's sentence word for word. /calibration's dialog text doesn't change, and `CalibrationPage.test.tsx:820-832` still pins it.
>     - It reads `targetBranch()`, as `BranchNotice` does: src/shell already imports from src/github.
>     - The studio says "publish" for New reveal and "save" for Edit card (R4-6a, R4-6b).
> - **Not in this task.**
>   - **The studio's own wording**, `studioUnsavedMessage`: R4-6a and R4-6b (hand-offs below). It must also word a hold that outlasts the draft it protects (design note 3).
>   - **Docs.** CLAUDE.md:18 is R4-7's. The plan's shared interfaces (`R-redesign.md:688-693`, and the file row at `:202`) are R4-8's "R4 as built". The contract additions below hold the exact lines.
> - **Verified in a scratch sandbox** (`scratchpad/r4-rebase/sandbox-R4-5s`; design note 6 has the details): red, then green, `tsc`, eslint, local CodeScene 10.0 for all 8 files, and 6 mutations.
> - **Re-checked by the verifier** (`scratchpad/r4-rebase/sandbox-v-R4-5s`, fresh `src` from the working tree): every Before block below matches the real file once and applies, the three red steps fail as quoted, then 79 tests pass, `tsc` exits 0, stdin eslint is clean on all 8 files, and CodeScene scores the changed modules 10.0. A scratch test confirmed design note 3's case: a hold that outlasts its draft leaves the open dialog with an empty question if the page's function returns ''.

> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). First read the main plan's decisions (R-57 to R-91 for R4), its corrections, global constraints and shared interfaces, and then the R4 header.

## Design notes (R4-5s)

1. **Where the target comes from.** In react-router 7.18.4, `Blocker` is a union:
   - `location` is a `Location` while the blocker is `blocked` or `proceeding`;
   - `location` is `undefined` while it is `unblocked`.

   `heldTarget` reads it only in `blocked`, and the hook gates it on `dirty`, as `blocked` was gated. So:
   - the render where a publish lands names no target. The existing case "never reports a hold in the render where the edits clear" gains that check.
   - while `leave()` proceeds, `to` is already null, and the dialog fades with its last words.

   `blocked` becomes `to !== null`, which keeps its meaning.

   The header's sketch of addition 4 comments `to` as `blocker.state === 'blocked' ? blocker.location : null`. Without the `dirty` gate, a target would show in the render where the edits clear (mutation M3 below).
2. **Why the dialog freezes its words, and not the guard.**
   - **Both message forms change when a hold ends.** The function has no target left. /calibration's ternary flips back to `UNSAVED_TUNING` once `publishing` ends.
   - **Only the dialog knows that it is closing.**
   - **While open, the words follow `message`.** That is right when a publish fails with the question open: the edits are unsaved again, and the dialog then says so.
   - **The hook stores what it saw.** It calls `setState` during render behind a comparison, React's "store what you saw" pattern. `useCardHandoff` does the same (`CardAnalyticsPage.tsx:41-50`), and it passes `react-hooks` 7.1.1 and `react-compiler`.
   - **It returns `shown`.** The render-time `setState` re-renders before commit, so `open ? message : shown` behaves the same. Mutation M2 confirmed this.
3. **When the message function runs.** The guard calls it during render, and only while a navigation is held. It must be pure: it reads the page's state and returns a line.
   - It gets the same `Location` that `leaves` saw as `to`. So it can tell a card change (`to.pathname === '/studio'`) from leaving the page.
   - **It must return a line for every target it gets.** While the dialog is open, its words follow what the function returns, and a hold can outlast what it protects. R2-5a ends a hold only once nothing is dirty (`R2-05a-unsaved-guard.md:692`). So a studio card change stays held after Edit's save lands while New reveal is still dirty, and words built only from the drafts at risk would then be empty (hand-off to R4-6a).
4. **Names.**
   - `to` matches `LeavesPage`'s `(from, to)`.
   - `UnsavedMessage` is exported as a type from the component file. `react-refresh/only-export-components` ignores type exports. Checked through `--stdin`: the rule does flag an exported function in the same file.
   - `WriteInFlight` is the header's one-object argument, so no primitive goes in, and a typo in the verb can't reach the dialog.
5. **Code Health.** The hand count covers the typed parameters of named functions; arrow constants are in brackets.

   | Module | Before | After | Largest cc |
   |---|---|---|---|
   | `src/shell/useUnsavedChangesGuard.ts` | 1 of 2 (`dirty`) [+2 Location] | 1 of 3 [+2 Location]. `heldTarget(blocker: Blocker)` adds a non-primitive. | the hook 8, `heldTarget` 2 |
   | `src/shell/UnsavedChangesGuard.tsx` | 0 of 2 [+1 event] | 1 of 5 [+1 event]: the dialog's and the guard's props, `useWordsShown`'s one object, and `messageFor`'s two. That counts `messageFor`'s `UnsavedMessage`, a union with `string`, as primitive. | `UnsavedChangesDialog` unchanged; `messageFor` 3; `useWordsShown` 3 |
   | `src/shell/writeInFlight.ts` | — | 0 of 1 (`{action}: WriteInFlight`) | 1 |
   | `src/tools/analytics/calibration/CalibrationPage.tsx` | unchanged (`publishingTuning` took none) | unchanged | unchanged |
   | `src/shell/UnsavedChangesGuard.test.tsx` | 0 of 1 (`tryToLeave`'s `user`) [+1 event] | 1 of 4 [+1 event, +3 Location]: `tryToLeave`'s `link = 'Elsewhere'` | each test 10 lines or fewer |

   - **The hook module** passed R2's gate at 1 of 2. Small modules at 100% primitive have passed too: `goLiveNote.ts` (1 string of 1) since R1, and `nav.ts` (4 of 4) in R3 (R-81).
   - **No function takes more than 2 arguments, and no condition chains `a || b || c`.**
   - **The new tests stay at 10 lines or fewer.** They use an `it.each` table, and `tryToLeave` takes the link to follow. A first draft held two navigations in one test, and scored 9.38 locally for Code Duplication against `Editor` and the modal test.
6. **The sandbox.**
   - **Setup.**
     - `src`, the configs and `index.html` come from the working tree: main `b490fb7` plus the uncommitted bump to `16283a13`. `src` is identical to main's.
     - `node_modules` and `upstream` are junctions to the repo, used read-only.
     - Vite's `cacheDir` and the tsbuildinfo stay in the sandbox.
     - A scratch `git init` lets the CodeScene CLI run.
   - **Baseline.** The three affected test files pass 71 tests: the guard's 7, the hook's 11 and `CalibrationPage`'s 53.
   - **Red.** Each red step below fails exactly as quoted.
   - **Green.** The four test files pass 79 tests: the guard's 11, the hook's 12, `writeInFlight`'s 3 and `CalibrationPage`'s 53.
   - **Typecheck.** `tsc -p tsconfig.app.json` exits 0.
   - **Lint.** `pnpm exec eslint --max-warnings 0 --stdin`, with the repo's config, is clean on all 8 files. A probe confirmed that the token rule and `react-refresh` fire through `--stdin`.
   - **CodeScene.** Local MCP 1.5.7 scores all 8 files 10.0.
   - **Mutations.** Six mutations were tried, and the tests caught five:
     - M1, no freeze: 2 failed.
     - M2, `return shown` in place of `open ? message : shown`: nothing failed, because the two behave the same (design note 2). The code now uses it.
     - M3, `to` ignores `dirty`: 1 failed.
     - M4, the function gets a target with its search stripped: 1 failed.
     - M5, the old guard: 4 failed.
     - M6, the words never follow `message` while the dialog is open: 1 failed.

### Contract additions (R4-5s)

They add a field, a type and a module; nothing that exists changes shape. They match the header's addition 4. They add three things the header's sketch left out:
- the `dirty` gate on `to` (design note 1);
- the dialog keeping its words while it fades (design note 2);
- a function `message` words every target it gets, since the open dialog shows what it returns (design note 3).

When R4-8 records "R4 as built", they replace `R-redesign.md:689` and `:693`, and the file row at `:202` gains `writeInFlight.ts`.

```ts
// src/shell/useUnsavedChangesGuard.ts (R-58: additive)
export interface UnsavedChangesGuardState {blocked: boolean; to: Location | null; stay: () => void; leave: () => void}
// to: where the held navigation goes; non-null exactly when blocked, so null in the render where the edits clear

// src/shell/UnsavedChangesGuard.tsx (R-58: additive; a string still works)
export type UnsavedMessage = string | ((to: Location) => string); // called during render, only while a navigation is held;
// the open dialog shows what it returns, so it never returns '' (see "Hand-offs": a hold can outlast what it protects)
export function UnsavedChangesGuard(props: {dirty: boolean; message: UnsavedMessage; leaves?: LeavesPage}): JSX.Element | null;
// UnsavedChangesDialog's props are unchanged; while it fades out it keeps the words it last showed open

// src/shell/writeInFlight.ts (R-58: R2's F13 line, moved from CalibrationPage)
export interface WriteInFlight {action: 'publish' | 'save'}
export function writeInFlightMessage({action}: WriteInFlight): string;
// "A {action} to {targetBranch()} is in progress. Leaving won't stop it, and you won't see whether it landed."

// Gone: CalibrationPage.tsx's private publishingTuning
```

### Task R4-5s: Guard wording

**Files:**
- **Create:**
  - `src/shell/writeInFlight.ts`
  - `src/shell/writeInFlight.test.ts`
- **Modify:**
  - `src/shell/useUnsavedChangesGuard.ts` (`:2`, after `:7`, after `:18`, after `:26`, `:55-60`; Step 8 gives the whole file)
  - `src/shell/UnsavedChangesGuard.tsx` (`:1`, `:47`, `:57`, `:78`, `:92-98`, `:105-108`)
  - `src/shell/useUnsavedChangesGuard.test.tsx` (`:4`, `:7-8`, `:17`, `:114`, `:151`)
  - `src/shell/UnsavedChangesGuard.test.tsx` (`:4-10`, `:19-20`, `:25`, `:28`, `:37-42`, `:109-110`)
  - `src/shell/UnsavedChangesGuard.stories.tsx` (`:2`, and after `:18`)
  - `src/tools/analytics/calibration/CalibrationPage.tsx` (`:2`, `:6`, `:18-21`, `:37`)
- **Checked and kept:**
  - `src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx`. Three of its cases pin what this task must not change:
    - `:757-767`, the unsaved line;
    - `:820-832`, the in-flight line, now through the shared helper;
    - `:872-881`, the page that lets a navigation through once the publish has landed.
  - `src/github/githubCommit.ts`, read only for `targetBranch()` at `:14`. Never touch it: it sits at the String Heavy Function Arguments edge.
  - `CLAUDE.md` and `docs/plans/**`, which R4-7 and R4-8 update (hand-offs below).

**Interfaces:**
- **Consumes:**
  - `useBlocker`, `type Blocker` and `type Location` from `react-router-dom` 7.18.4. `Blocker` is `BlockerUnblocked | BlockerBlocked | BlockerProceeding`, and its `location` is a `Location` while it is `blocked`.
  - `targetBranch()` from `src/github/githubCommit.ts:14`, which `BranchNotice.tsx:2` imports too.
  - The bridged `DialogShell` (`src/app-bridge.ts:45`). It keeps a closed dialog mounted until its exit transition ends or 400 ms pass (`DialogShell.tsx:21`, `:171`, `:184`; `useTransitionPresence.ts:18`, `:46`, at the pin).
- **Produces:** the "Contract additions (R4-5s)" block above. Its consumers:
  - **R4-6a** mounts the studio's one guard with `message={(to) => …}`. Its `studioUnsavedMessage` uses `writeInFlightMessage({action: 'publish'})` for New reveal and `writeInFlightMessage({action: 'save'})` for Edit card.
  - **R4-6b** adds the page test for a card change, and Edit's wording only if R4-6a leaves it.
  - **/calibration** passes `writeInFlightMessage({action: 'publish'})`.

- [ ] **Step 1: Check what this task builds on**

From the repo root:

```bash
git branch --show-current
git status --short -- src/shell src/tools/analytics/calibration
git grep -n -E "message: string;|message=\{message\}|blocked: dirty && blocker.state === 'blocked'|publishingTuning|targetBranch" -- src/shell/UnsavedChangesGuard.tsx src/shell/useUnsavedChangesGuard.ts src/tools/analytics/calibration/CalibrationPage.tsx
git ls-files src/shell/writeInFlight.ts
```

Expected:
- `feature/24-redesign-r4`, then nothing from `git status`: earlier tasks committed their work. Of them, only R4-5a touches `src/shell` (`nav.ts` and `nav.test.ts`: `studioHref`), and this task consumes nothing from any of them. It builds on main's R2 guard and R2's in-flight line.
- Exactly these eight lines from `git grep`:
  ```
  src/shell/UnsavedChangesGuard.tsx:44:  message: string;
  src/shell/UnsavedChangesGuard.tsx:95:  message: string;
  src/shell/UnsavedChangesGuard.tsx:107:  return <UnsavedChangesDialog open={guard.blocked} message={message} onStay={guard.stay} onLeave={guard.leave} />;
  src/shell/useUnsavedChangesGuard.ts:57:    blocked: dirty && blocker.state === 'blocked',
  src/tools/analytics/calibration/CalibrationPage.tsx:2:import {targetBranch} from '../../../github/githubCommit';
  src/tools/analytics/calibration/CalibrationPage.tsx:19:const publishingTuning = () =>
  src/tools/analytics/calibration/CalibrationPage.tsx:20:  `A publish to ${targetBranch()} is in progress. Leaving won't stop it, and you won't see whether it landed.`;
  src/tools/analytics/calibration/CalibrationPage.tsx:37:        message={admin.publishing ? publishingTuning() : UNSAVED_TUNING}
  ```
- Nothing from `git ls-files`: the helper doesn't exist yet.

What to do if the output differs:
- **`writeInFlight.ts` exists, or the props already take a function:** another task did this work. Stop and report.
- **The line numbers differ but the lines are the same:** apply the Before blocks to the lines as they are.

- [ ] **Step 2: Write the shared line's failing test**

Create `src/shell/writeInFlight.test.ts`:

```ts
import {afterEach, describe, expect, it, vi} from 'vitest';
import {writeInFlightMessage} from './writeInFlight';

afterEach(() => vi.unstubAllEnvs());

describe('writeInFlightMessage', () => {
  it.each([
    ['publish', "A publish to master is in progress. Leaving won't stop it, and you won't see whether it landed."],
    ['save', "A save to master is in progress. Leaving won't stop it, and you won't see whether it landed."],
  ] as const)('says leaving a %s in flight neither stops it nor shows how it went', (action, line) => {
    expect(writeInFlightMessage({action})).toBe(line);
  });

  it('names the branch the tools write to', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(writeInFlightMessage({action: 'save'})).toBe(
      "A save to admin-verify is in progress. Leaving won't stop it, and you won't see whether it landed.",
    );
  });
});
```

`afterEach` restores the env stub, because the app project shares a worker across files. `vite.config.ts` pins the variable empty for every test, which means master.

- [ ] **Step 3: Run it, and see it fail**

Run: `pnpm vitest run --project app src/shell/writeInFlight.test.ts`
Expected: the file fails to load, because the module doesn't exist yet:
```
Error: Failed to resolve import "./writeInFlight" from "src/shell/writeInFlight.test.ts". Does the file exist?
```

- [ ] **Step 4: Write `src/shell/writeInFlight.ts`**

```ts
import {targetBranch} from '../github/githubCommit';

/** A commit a page has in flight, in the page's own word for it. */
export interface WriteInFlight {
  action: 'publish' | 'save';
}

/**
 * What leaving mid-commit means (R2's F13 wording, shared since R-58): nothing
 * recalls the commit, and only the page that made it would show how it went.
 * /calibration's tuning publish and the studio's New reveal say "publish";
 * Edit card says "save".
 */
export function writeInFlightMessage({action}: WriteInFlight): string {
  return `A ${action} to ${targetBranch()} is in progress. Leaving won't stop it, and you won't see whether it landed.`;
}
```

- [ ] **Step 5: Run it to PASS**

Run: `pnpm vitest run --project app src/shell/writeInFlight.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Write the hook's failing tests**

In `src/shell/useUnsavedChangesGuard.test.tsx`:

The import (`:4`). Before:
```tsx
import {createMemoryRouter, Link, RouterProvider} from 'react-router-dom';
```
After:
```tsx
import {createMemoryRouter, Link, RouterProvider, type Location} from 'react-router-dom';
```

The render log (`:7-8`). Before:
```tsx
/** What the page saw in each render: its edits, and whether the guard said a navigation is held. */
const renders: Array<{dirty: boolean; blocked: boolean}> = [];
```
After:
```tsx
/** What the page saw in each render: its edits, whether the guard said a navigation is held, and where to. */
const renders: Array<{dirty: boolean; blocked: boolean; to: string | null}> = [];
const where = (to: Location | null) => (to ? `${to.pathname}${to.search}` : null);
```

The page's log line (`:17`). Before:
```tsx
  renders.push({dirty, blocked: guard.blocked});
```
After:
```tsx
  renders.push({dirty, blocked: guard.blocked, to: where(guard.to)});
```

The "holds a search change too" case gets one more line after `:114`, and a new case follows it after `:115`. Before:
```tsx
    expect(await screen.findByText('Held')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });
```
After:
```tsx
    expect(await screen.findByText('Held')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    expect(renders.at(-1)?.to).toBe('/editor?rule=ramp');
  });

  it('says where the held navigation goes while it is held, and nowhere otherwise (R-58)', async () => {
    const {user} = renderEditor();
    await user.click(editsSwitch());
    expect(renders.at(-1)).toEqual({dirty: true, blocked: false, to: null});
    await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
    expect(await screen.findByText('Held')).toBeInTheDocument();
    expect(renders.at(-1)).toEqual({dirty: true, blocked: true, to: '/elsewhere'});
    await user.click(screen.getByRole('button', {name: 'Stay'}));
    expect(renders.at(-1)).toEqual({dirty: true, blocked: false, to: null});
    // A target is named exactly when a hold is reported.
    expect(renders.filter((render) => render.blocked !== (render.to !== null))).toEqual([]);
  });
```

In "never reports a hold in the render where the edits clear", add one line after `:151`. Before:
```tsx
    expect(renders.filter((render) => !render.dirty && render.blocked)).toEqual([]);
```
After:
```tsx
    expect(renders.filter((render) => !render.dirty && render.blocked)).toEqual([]);
    expect(renders.filter((render) => !render.dirty && render.to !== null)).toEqual([]);
```

- [ ] **Step 7: Run them, and see them fail**

Run: `pnpm vitest run --project app src/shell/useUnsavedChangesGuard.test.tsx`
Expected: 2 failed, 10 passed:
```
× holds a search change too when the page says that leaves (R4: another card)
× says where the held navigation goes while it is held, and nowhere otherwise (R-58)
AssertionError: expected null to be '/editor?rule=ramp' // Object.is equality
AssertionError: expected { Object (dirty, blocked, ...) } to deeply equal { dirty: true, blocked: true, …(1) }
```
The "edits clear" case still passes, because the old hook has no `to` and the log records `null`.

- [ ] **Step 8: Give the hook `to`**

Replace `src/shell/useUnsavedChangesGuard.ts` with the file below. Compared with today's file, it changes five places:
- the import (`:2`);
- the state's `to` field (after `blocked` at `:7`);
- `heldTarget` (after `:18`);
- one bullet in the doc comment (after `:26`);
- the return (`:55-60`).

```ts
import {useEffect} from 'react';
import {useBlocker, type Blocker, type Location} from 'react-router-dom';

/** What a page with unsaved edits needs to ask before they are lost. */
export interface UnsavedChangesGuardState {
  /** A navigation to another page is on hold until stay() or leave(). */
  blocked: boolean;
  /** Where the held navigation goes, while one is held; null otherwise. A page can word its question for it (R-58). */
  to: Location | null;
  /** Cancels the held navigation: the page stays, edits and all. */
  stay: () => void;
  /** Lets the held navigation through, and the edits are lost. */
  leave: () => void;
}

/** Whether a navigation from one location to another leaves what the page guards. */
export type LeavesPage = (from: Location, to: Location) => boolean;

/** The default: only a new pathname leaves, so ?rule= and other search changes keep the page. */
const toAnotherPath: LeavesPage = (from, to) => from.pathname !== to.pathname;

/** Where the blocker holds a navigation to, while it holds one. */
function heldTarget(blocker: Blocker): Location | null {
  return blocker.state === 'blocked' ? blocker.location : null;
}

/**
 * Guards unsaved edits (decision R-19). While `dirty`:
 * - a navigation that leaves (a sidebar link, the browser's Back) is held
 *   until the page answers with stay() or leave(). By default only a new
 *   pathname leaves: the same page with other search params (?rule=) keeps
 *   its state, so it is never held. A page whose search holds what it edits
 *   (R4's ?card=) passes its own `leaves`;
 * - while a navigation is held, `to` says where it goes, so a page that loses
 *   only some of its edits to it (R4's studio: a card change drops the Edit
 *   draft, leaving drops both) can say which (R-58);
 * - closing or reloading the tab raises the browser's own prompt, in the
 *   browser's own words.
 *
 * useBlocker needs a data router (the app's createBrowserRouter; in tests,
 * createMemoryRouter), and the router holds one blocker at a time, so a page
 * mounts one guard. Edits that clear while a navigation is held (a publish
 * that lands) end the hold as a stay: the page keeps showing the publish's
 * outcome, and the old navigation never comes back.
 */
export function useUnsavedChangesGuard(dirty: boolean, leaves: LeavesPage = toAnotherPath): UnsavedChangesGuardState {
  const blocker = useBlocker(({currentLocation, nextLocation}) => dirty && leaves(currentLocation, nextLocation));

  // A hold with nothing left to lose ends, as react-router's own usePrompt ends it.
  useEffect(() => {
    if (blocker.state === 'blocked' && !dirty) blocker.reset();
  }, [blocker, dirty]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Chrome and Edge before 119 prompt only for a truthy returnValue.
      event.returnValue = true;
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // `dirty` too, so the render where the edits clear already shows no question and names no target.
  const to = dirty ? heldTarget(blocker) : null;
  return {
    blocked: to !== null,
    to,
    stay: () => blocker.reset?.(),
    leave: () => blocker.proceed?.(),
  };
}
```

Keep `heldTarget` outside the hook. Inline, the target's ternary takes the hook to cyclomatic complexity 9, one past the gate (design note 5).

- [ ] **Step 9: Run them to PASS**

Run: `pnpm vitest run --project app src/shell/useUnsavedChangesGuard.test.tsx`
Expected: 12 passed.

- [ ] **Step 10: Write the guard's failing tests**

In `src/shell/UnsavedChangesGuard.test.tsx`:

The imports, the message and the page (`:4-10`). Before:
```tsx
import {createMemoryRouter, Link, RouterProvider} from 'react-router-dom';
import {UnsavedChangesGuard} from './UnsavedChangesGuard';

const MESSAGE = "2 pending tuning edits aren't published yet. Leaving this page drops them.";

/** A page with an "Unsaved edits" switch and a link away, guarded as R2-6's page is. */
function Editor() {
```
After:
```tsx
import {createMemoryRouter, Link, RouterProvider} from 'react-router-dom';
import {UnsavedChangesDialog, UnsavedChangesGuard, type UnsavedMessage} from './UnsavedChangesGuard';
import type {LeavesPage} from './useUnsavedChangesGuard';
import {writeInFlightMessage} from './writeInFlight';

const MESSAGE = "2 pending tuning edits aren't published yet. Leaving this page drops them.";

/** A change of ?card= leaves too, as it does in R4's studio (shouldBlockStudioNavigation). */
const holdsCards: LeavesPage = (from, to) => from.pathname !== to.pathname || from.search !== to.search;
/** A line worded for the held navigation, as the studio's names the drafts it drops (R-58). */
const goingTo: UnsavedMessage = (to) => `Going to ${to.pathname}${to.search} drops them.`;

interface EditorProps {
  message?: UnsavedMessage;
  leaves?: LeavesPage;
}

/** A page with an "Unsaved edits" switch and links away, guarded as R2-6's page is, or as R4's studio is with props. */
function Editor({message = MESSAGE, leaves}: EditorProps) {
```

The page's links and guard (`:19-20`). Before:
```tsx
      <Link to="/elsewhere">Elsewhere</Link>
      <UnsavedChangesGuard dirty={dirty} message={MESSAGE} />
```
After:
```tsx
      <Link to="/elsewhere">Elsewhere</Link>
      <Link to="/editor?card=2">Another card</Link>
      <UnsavedChangesGuard dirty={dirty} message={message} leaves={leaves} />
```

`renderEditor` (`:25` and `:28`). Before:
```tsx
function renderEditor() {
  const router = createMemoryRouter(
    [
      {path: '/editor', element: <Editor />},
```
After:
```tsx
function renderEditor(props: EditorProps = {}) {
  const router = createMemoryRouter(
    [
      {path: '/editor', element: <Editor {...props} />},
```

`tryToLeave` (`:37-42`). Before:
```tsx
/** Stages an edit, then follows the link away, which the guard holds. */
async function tryToLeave(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('checkbox', {name: 'Unsaved edits'}));
  await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
  return screen.findByRole('dialog', {name: 'Leave this page?'});
}
```
After:
```tsx
/** Stages an edit, then follows a link the guard holds (by default the one away), and returns its question. */
async function tryToLeave(user: ReturnType<typeof userEvent.setup>, link = 'Elsewhere') {
  await user.click(screen.getByRole('checkbox', {name: 'Unsaved edits'}));
  await user.click(screen.getByRole('link', {name: link}));
  return screen.findByRole('dialog', {name: 'Leave this page?'});
}
```

Then the end of the file (`:109-110`: the last case's closing line, then the `describe`'s). Before:
```tsx
  });
});
```
After:
```tsx
  });

  it.each([
    ['Another card', 'Going to /editor?card=2 drops them.'],
    ['Elsewhere', 'Going to /elsewhere drops them.'],
  ])('words its question for where the held navigation goes: %s (R-58)', async (link, line) => {
    const {user} = renderEditor({message: goingTo, leaves: holdsCards});
    expect(await tryToLeave(user, link)).toHaveTextContent(line);
  });

  it('keeps the words it asked with while the dialog fades out after Stay', async () => {
    const {user} = renderEditor({message: goingTo});
    const dialog = await tryToLeave(user);
    await user.click(within(dialog).getByRole('button', {name: 'Stay on this page'}));
    // The hold is over, so no target is left to word a line for: the fading panel keeps the line it showed.
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Going to /elsewhere drops them.');
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  });
});

describe('UnsavedChangesDialog', () => {
  const answers = {onStay: vi.fn(), onLeave: vi.fn()};

  it('follows its message while open, and keeps the last one while it fades out', async () => {
    const publishing = writeInFlightMessage({action: 'publish'});
    const {rerender} = render(<UnsavedChangesDialog open message={publishing} {...answers} />);
    const dialog = screen.getByRole('dialog', {name: 'Leave this page?'});
    // The publish failed with the question open: the edits are unsaved again, and the question says so.
    rerender(<UnsavedChangesDialog open message={MESSAGE} {...answers} />);
    expect(dialog).toHaveTextContent(MESSAGE);
    // The edits cleared, so the question closes: it fades out with the words it showed, not the page's new ones.
    rerender(<UnsavedChangesDialog open={false} message="" {...answers} />);
    expect(dialog).toHaveTextContent(MESSAGE);
    await waitForElementToBeRemoved(dialog);
  });
});
```

Notes on these cases:
- **The fade cases rely on `DialogShell`.** It keeps a closed dialog mounted until its exit transition ends or 400 ms pass. `waitForElementToBeRemoved` throws if the element is already gone, so it also proves the dialog was still mounted when its words were read.
- **The seven existing cases are unchanged.** They still render `MESSAGE` through the default prop.
- **No stubs to restore.** The file sets none.

- [ ] **Step 11: Run them, and see them fail**

Run: `pnpm vitest run --project app src/shell/UnsavedChangesGuard.test.tsx`
Expected: 4 failed, 7 passed:
```
× words its question for where the held navigation goes: Another card (R-58)
× words its question for where the held navigation goes: Elsewhere (R-58)
× keeps the words it asked with while the dialog fades out after Stay
× follows its message while open, and keeps the last one while it fades out
```
- Each fails on `expect(element).toHaveTextContent()`. The expected texts are "Going to /editor?card=2 drops them.", "Going to /elsewhere drops them." (twice) and the `MESSAGE` line.
- React also logs "Functions are not valid as a React child" on stderr, because today's dialog renders the function itself.

- [ ] **Step 12: Let the guard word its question, and the dialog keep its words while it fades**

In `src/shell/UnsavedChangesGuard.tsx`:

The imports (`:1`). Before:
```tsx
import {useRef} from 'react';
```
After:
```tsx
import {useRef, useState} from 'react';
import type {Location} from 'react-router-dom';
```

After `UnsavedChangesDialogProps` (its closing `}` is at `:47`), add:
```tsx

/**
 * The words the dialog shows. While it is open they follow `message`: a publish
 * that fails mid-question turns the in-flight wording back into the unsaved one.
 * While it fades out they stay as they were: the hold is over by then, so a line
 * worded for the held navigation has nothing left to name, and a page whose
 * edits just cleared would word it differently.
 */
function useWordsShown({open, message}: Pick<UnsavedChangesDialogProps, 'open' | 'message'>): string {
  const [shown, setShown] = useState(message);
  if (open && message !== shown) setShown(message);
  return shown;
}
```

The dialog's first line (`:57`). Before:
```tsx
export function UnsavedChangesDialog({open, message, onStay, onLeave}: UnsavedChangesDialogProps) {
  const messageRef = useRef<HTMLParagraphElement>(null);
```
After:
```tsx
export function UnsavedChangesDialog({open, message, onStay, onLeave}: UnsavedChangesDialogProps) {
  const words = useWordsShown({open, message});
  const messageRef = useRef<HTMLParagraphElement>(null);
```

The message's text (`:78`). Before:
```tsx
        {message}
```
After:
```tsx
        {words}
```

The guard's props (`:92-98`). Before:
```tsx
interface UnsavedChangesGuardProps {
  /** The page holds edits that leaving would lose. */
  dirty: boolean;
  message: string;
  /** Which navigations leave (R4's card change in Edit). Defaults to a new pathname. */
  leaves?: LeavesPage;
}
```
After:
```tsx
/**
 * What leaving loses: one line (/calibration's), or a line worded for where the
 * held navigation goes (R-58: the studio's card change names only the Edit
 * draft). The guard asks for the line only while a navigation is held, and the
 * open dialog shows what it returns, so a function words every target it gets,
 * even one that no longer drops anything.
 */
export type UnsavedMessage = string | ((to: Location) => string);

/** The line for the navigation held now; none while nothing is held, when the dialog keeps its last. */
function messageFor(message: UnsavedMessage, to: Location | null): string {
  if (typeof message === 'string') return message;
  return to ? message(to) : '';
}

interface UnsavedChangesGuardProps {
  /** The page holds edits that leaving would lose. */
  dirty: boolean;
  message: UnsavedMessage;
  /** Which navigations leave (R4's card change in Edit). Defaults to a new pathname. */
  leaves?: LeavesPage;
}
```

The guard's body (`:105-108`). Before:
```tsx
export function UnsavedChangesGuard({dirty, message, leaves}: UnsavedChangesGuardProps) {
  const guard = useUnsavedChangesGuard(dirty, leaves);
  return <UnsavedChangesDialog open={guard.blocked} message={message} onStay={guard.stay} onLeave={guard.leave} />;
}
```
After:
```tsx
export function UnsavedChangesGuard({dirty, message, leaves}: UnsavedChangesGuardProps) {
  const guard = useUnsavedChangesGuard(dirty, leaves);
  return (
    <UnsavedChangesDialog
      open={guard.blocked}
      message={messageFor(message, guard.to)}
      onStay={guard.stay}
      onLeave={guard.leave}
    />
  );
}
```

`UnsavedChangesDialog`'s doc comment (`:49-56`) and its props stay as they are. Keep two things as written:
- **The render-time `setState`.** `useWordsShown` stores what it saw, as `useCardHandoff` does (`CardAnalyticsPage.tsx:44-48`), and passes `react-hooks` and `react-compiler`. Don't move it into an effect: an effect would paint one frame with the wrong words.
- **The inline function.** A page passes `message` as an inline function. It gets no `useCallback` (MEMO_BAN).

- [ ] **Step 13: Run them to PASS**

Run: `pnpm vitest run --project app src/shell/UnsavedChangesGuard.test.tsx src/shell/useUnsavedChangesGuard.test.tsx`
Expected: 23 passed (11 and 12).

- [ ] **Step 14: /calibration takes the shared line**

In `src/tools/analytics/calibration/CalibrationPage.tsx`:

Delete the `targetBranch` import (`:2`). Before:
```tsx
import {useSearchParams} from 'react-router-dom';
import {targetBranch} from '../../../github/githubCommit';
import {useGithubToken} from '../../../github/useGithubToken';
```
After:
```tsx
import {useSearchParams} from 'react-router-dom';
import {useGithubToken} from '../../../github/useGithubToken';
```

Import the shared line after the guard's import (`:6`). Before:
```tsx
import {UnsavedChangesGuard} from '../../../shell/UnsavedChangesGuard';
```
After:
```tsx
import {UnsavedChangesGuard} from '../../../shell/UnsavedChangesGuard';
import {writeInFlightMessage} from '../../../shell/writeInFlight';
```

Delete `publishingTuning`, its comment and the blank line after it (`:18-21`). Before:
```tsx
/** What leaving mid-publish means: nothing recalls the commit, and only this page would show how it went. */
const publishingTuning = () =>
  `A publish to ${targetBranch()} is in progress. Leaving won't stop it, and you won't see whether it landed.`;

```
After: nothing. `UNSAVED_TUNING` and its comment (`:15-16`) stay.

The guard's message (`:37`). Before:
```tsx
        message={admin.publishing ? publishingTuning() : UNSAVED_TUNING}
```
After:
```tsx
        message={admin.publishing ? writeInFlightMessage({action: 'publish'}) : UNSAVED_TUNING}
```

Run: `pnpm vitest run --project app src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx src/shell/writeInFlight.test.ts`
Expected: 56 passed (53 and 3). `CalibrationPage.test.tsx` is unchanged:
- `:820-832` still finds "A publish to master is in progress. Leaving won't stop it, and you won't see whether it landed." in the dialog, now through the shared helper;
- `:757-767` still finds the unsaved line.

- [ ] **Step 15: The dialog's story**

In `src/shell/UnsavedChangesGuard.stories.tsx`:

The imports (`:2`). Before:
```tsx
import {UnsavedChangesDialog} from './UnsavedChangesGuard';
```
After:
```tsx
import {UnsavedChangesDialog} from './UnsavedChangesGuard';
import {writeInFlightMessage} from './writeInFlight';
```

Append after `export const Open: Story = {};` (`:18`, the last line):
```tsx

/** Leaving while a commit is in flight, in the wording /calibration and the studio share (R-58). */
export const CommitInFlight: Story = {args: {message: writeInFlightMessage({action: 'save'})}};
```

Like `Open`, the story shows only the dialog. The guard and its function form need the data router, which a story doesn't have (`CalibrationPage.tsx:26-28`), so the tests cover them.

- [ ] **Step 16: Check the line lives in one place**

Run: `git grep -n -E "publishingTuning|is in progress\. Leaving" -- src`
Expected: exactly these five lines. The sentence is built only in `writeInFlight.ts`, and `publishingTuning` is gone:
```
src/shell/writeInFlight.test.ts:8:    ['publish', "A publish to master is in progress. Leaving won't stop it, and you won't see whether it landed."],
src/shell/writeInFlight.test.ts:9:    ['save', "A save to master is in progress. Leaving won't stop it, and you won't see whether it landed."],
src/shell/writeInFlight.test.ts:17:      "A save to admin-verify is in progress. Leaving won't stop it, and you won't see whether it landed.",
src/shell/writeInFlight.ts:15:  return `A ${action} to ${targetBranch()} is in progress. Leaving won't stop it, and you won't see whether it landed.`;
src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx:829:      "A publish to master is in progress. Leaving won't stop it, and you won't see whether it landed.",
```

- [ ] **Step 17: Lint the changed files, and typecheck once**

Run:
```bash
pnpm exec eslint --max-warnings 0 src/shell/writeInFlight.ts src/shell/writeInFlight.test.ts src/shell/useUnsavedChangesGuard.ts src/shell/useUnsavedChangesGuard.test.tsx src/shell/UnsavedChangesGuard.tsx src/shell/UnsavedChangesGuard.test.tsx src/shell/UnsavedChangesGuard.stories.tsx src/tools/analytics/calibration/CalibrationPage.tsx
```
Expected: no output, exit 0. `react-refresh` accepts the `UnsavedMessage` type export, and `react-compiler` accepts the render-time `setState`.

Run: `pnpm typecheck`
Expected: exit 0. It checks the `Blocker` narrowing in `heldTarget`, the story's args, and `renders.at(-1)` (the app's lib is ES2022).

Don't run the full `pnpm lint` or `pnpm test:run` here: the pre-commit hook runs both (gates once). Don't run `pnpm build` either: R4-8 runs it.

- [ ] **Step 18: Code Health**

Run CodeScene's `code_health_review` on the 8 files in Step 19's `git add`.

Expected: 10.0 each, with no findings, as local MCP 1.5.7 scored them in the sandbox. If a finding appears, fix it before the commit:
- **"Complex Method" on `useUnsavedChangesGuard`:** the target's logic is back in the hook. Keep it in `heldTarget` (Step 8).
- **"Code Duplication" in `UnsavedChangesGuard.test.tsx`:** a case has grown past 10 lines. Use the `it.each` table and `tryToLeave(user, link)`, as Step 10 does.

The PR's server gate is stricter, so R4-8 runs `analyze_change_set`. Design note 5 has the hand count.

- [ ] **Step 19: Commit**

Commit only after the owner approves. Use two separate Bash calls, and never pipe the commit:

```bash
git add src/shell/writeInFlight.ts src/shell/writeInFlight.test.ts src/shell/useUnsavedChangesGuard.ts src/shell/useUnsavedChangesGuard.test.tsx src/shell/UnsavedChangesGuard.tsx src/shell/UnsavedChangesGuard.test.tsx src/shell/UnsavedChangesGuard.stories.tsx src/tools/analytics/calibration/CalibrationPage.tsx
```

```bash
USER_APPROVED=1 git commit -m "feat(shell): word the unsaved-changes guard for the held navigation (#24)"
```

- The pre-commit hook runs the full lint and `test:run`. Never pass `--no-verify`.
- If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry.
- Afterwards, `git status --short -- src` prints nothing.

### Hand-offs from R4-5s

- **The R4 header (contract addition 4).** Align its sketch with what this task builds:
  - **`to`'s comment** reads `dirty ? heldTarget(blocker) : null`, where `heldTarget` is `blocker.state === 'blocked' ? blocker.location : null`.
  - **The type `UnsavedMessage`** is exported for `message`. A function words every target it gets: the open dialog shows what it returns.
  - **`UnsavedChangesDialog`** keeps its last words while it fades out.
  - **The file row** names `src/shell/writeInFlight.ts`.
- **R4-6a (the studio page and its one guard).** `StudioWorkspace` mounts the guard as the header's addition 4 sketches it, with a function `message`:
  ```tsx
  <UnsavedChangesGuard
    dirty={drafts.reveal || drafts.edit}
    leaves={(from, to) => shouldBlockStudioNavigation(from, to, drafts)}
    message={(to) => studioUnsavedMessage({from: location, to, drafts, busy})}
  />
  ```
  - **`studioUnsavedMessage` is a pure helper** in `studioPaths.ts`, with its own table test.
    - It takes one object, which keeps the module off Primitive Obsession.
    - The guard calls it only while a navigation is held, so at least one draft is dirty, though not always one the navigation drops (below).
  - **The rule (R-58).**
    - **A card change** (`to.pathname === '/studio'`; a mode switch is never held, R-57) names only the Edit draft.
    - **Any other target** names every dirty draft.
    - **A draft whose write is in flight** gets `writeInFlightMessage({action: 'publish'})` (New reveal, while `ctrl.publishing`) or `writeInFlightMessage({action: 'save'})` (Edit, while `edit.saving`), in place of its unsaved line.
  - **Its page test** goes through `createMemoryRouter`, as this task's tests do. With edits in both drafts:
    - changing the Edit card names Edit only;
    - going to `/` names both.
  - **During the fade, the dialog keeps the line it showed** (this task). That covers a hold that ends, not one that outlasts what it protects.
  - **Word the hold that outlasts its draft.** Take a save that lands while a card change is held, with New reveal still dirty (R2-5a's hand-off, `R2-05a-unsaved-guard.md:692`):
    - the hold stays, so the dialog stays open, and either answer is then safe;
    - the guard calls `message` again with Edit clean, so `draftsAtRisk` names no draft;
    - the open dialog follows what comes back, and a join of no lines would leave it with an empty question.

    So `studioUnsavedMessage` returns a line when `draftsAtRisk` names nothing, for example "Your changes to this card are saved. Leaving the card drops nothing.", and its table test gets that row (a card change, `drafts` with only `reveal` dirty, `busy` clean).
- **R4-6b (the Edit pane).** It adds Edit's line, and the save's `writeInFlightMessage({action: 'save'})`, to `studioUnsavedMessage` if R4-6a leaves Edit's half to it. It needs nothing else from this task.
- **R4-7 (docs).** CLAUDE.md:18 describes the guard as built:
  - `message` may be a function of where the held navigation goes (R-58);
  - `writeInFlightMessage` words a commit in flight, and /calibration and the studio share it;
  - the studio mounts the one guard with its own `leaves` and its own wording.
- **R4-8 ("R4 as built").**
  - Record the contract additions above over `R-redesign.md:689` and `:693`, and add `src/shell/writeInFlight.ts` to the file row at `:202`.
  - The story this task adds is `Admin/UnsavedChangesDialog` → Commit In Flight: the dialog with the in-flight line. No story renders the message function, which needs the data router (Step 15).
  - `analyze_change_set` covers this task's modules. Design note 5 has the hand count; the hook module sits at 1 of 3, below its R2 count of 1 of 2.
