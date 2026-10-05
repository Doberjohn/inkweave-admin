> Part of [R: Admin redesign](../R-redesign.md), phase R2 ([R2-calibration-tuning.md](R2-calibration-tuning.md)). Read the main plan's decisions (R-17 to R-26 for R2), corrections, global constraints and shared interfaces, then the R2 header, first.

## Re-base notes (R2-5a)

- **New task.** The 2026-10-01 outline had no guard. Its open question 3 asked whether to add one, and decision R-19 (owner, 2026-10-05) says yes: `useBlocker` for in-app navigation, `beforeunload` for a tab close or reload, as a reusable hook that R4's Card studio also uses. R2-5a sits after R2-5 and before R2-6, which mounts it. It depends on nothing from R2-1 to R2-5, so it can run any time before R2-6.
- **Checked against the real code (main `c92e260`) and the pin (`bc877e1`).**
  - The app uses a data router: `src/router.tsx:31` builds it with `createBrowserRouter(routes)`, and `src/main.tsx:11` renders it through `RouterProvider`. `useBlocker` (react-router 7.18.4) works only under one.
  - At `bc877e1`, the app's `DialogShell` (`apps/web/src/shared/components/DialogShell.tsx`), its hook trio (`shared/hooks`) and the `inkweave/no-unshelled-dialogs` rule (`apps/web/eslint-rules/index.js:287-321`) are as described below. `CtaButton` takes `ButtonHTMLAttributes`, with no `ref`.
  - No admin or app code uses `useBlocker` or `beforeunload` today.
  - None of R1's deferred items in `.superpowers/sdd/R-redesign/progress.md` touch this task. The R2-relevant ones belong to R2-4a (LineChart `yDomain`) and R2-6 (`?rule=` writes).
- **The confirm UI is the app's `DialogShell`, bridged, not `window.confirm`.** Design note 1 below gives the reasons.
- **The hook takes `dirty` and an optional `leaves`. The message is the component's prop.** The header's contract addition 11 named `message` as a hook input. A message has nowhere to go in the hook: browsers ignore page text in the `beforeunload` prompt, so only the in-app dialog shows it.
- **By default only a change of pathname counts as leaving.** R2-6 keeps the selected rule in `?rule=` (`setSearchParams(…, {replace: true})`). A guard that held every navigation would ask on each rule click. A page whose search does hold state passes `leaves` instead: R4's studio holds a change of `?card=` in Edit (`shouldBlockStudioNavigation`, `R4-card-studio.md:633-634, 756-759`).
- **The header changes with this task.** R2-5a replaces the header's `window.confirm` design. Edit `R2-calibration-tuning.md`'s header as follows:
  - **Line 9 (re-base note 4):** "**R-19.** New task R2-5a: `useUnsavedChangesGuard` and `UnsavedChangesGuard` (the app's `DialogShell`, bridged). R2-6 mounts `<UnsavedChangesGuard>` in `TunedWorkspace`." It ends with the two owner flags below, beside note 8's "**Flag this to the owner at review.**"
  - **Line 18 (note 11's sandbox list):** "The `useUnsavedChangesGuard` sketch: 4 cases under `createMemoryRouter` with `window.confirm`. R2-5a's 14 tests supersede it."
  - **Lines 168-175 (contract addition 11):** replace the signature and the first three bullets with this task's contract block below. Keep the "**Where to call it.**" bullet.
  - **Line 262 (Hooks):** "mounts `<UnsavedChangesGuard dirty={admin.pending.length > 0} message={UNSAVED_TUNING} />` (R-19);"
  - **Line 424 (task table, Delivers):** "`DialogShell` bridged; `useUnsavedChangesGuard`, `UnsavedChangesGuard`/`UnsavedChangesDialog`, their two tests and story (new)".
  - **Line 425 (task table, R2-6):** "(`TunedWorkspace` mounts `UnsavedChangesGuard`)".
- **Owner flags (overrulable at review).**
  - **Bridging `DialogShell`.** It couples admin to one more app component, which the owner hasn't approved. The fallback is the header's original `window.confirm` design, with the costs design note 1 lists.
  - **Message-first focus.** Design note 5's trade-off: the APG would put first focus on "Stay on this page", which `CtaButton` can't take.
- **Hand-offs** for R2-6, R4 and the R2 docs are at the end.

**Contract additions.** These replace the header's contract addition 11 (`window.confirm`, `message` on the hook) and add the names below.
```ts
// src/app-bridge.ts gains
export {DialogShell} from '../upstream/inkweave/apps/web/src/shared/components/DialogShell';

// src/shell/useUnsavedChangesGuard.ts
export interface UnsavedChangesGuardState {blocked: boolean; stay: () => void; leave: () => void}
export type LeavesPage = (from: Location, to: Location) => boolean; // Location from react-router-dom
export function useUnsavedChangesGuard(dirty: boolean, leaves?: LeavesPage): UnsavedChangesGuardState;
// Holds a navigation that leaves while dirty: by default one to another pathname (never a search-only
// change), or whatever `leaves` says. Has the browser confirm a tab close or reload while dirty.
// Needs a data router. One per page.

// src/shell/UnsavedChangesGuard.tsx
export function UnsavedChangesDialog(props: {open: boolean; message: string; onStay: () => void; onLeave: () => void}): JSX.Element | null;
export function UnsavedChangesGuard(props: {dirty: boolean; message: string; leaves?: LeavesPage}): JSX.Element | null;
// The dialog: DialogShell named "Leave this page?", h2 of the same text, the message (focused on open),
// then "Stay on this page" (CtaButton) and "Leave this page" (CtaButton neutral). Escape and the scrim stay.
```
In the main plan's "File structure (R1)" table, add one row: `src/shell/useUnsavedChangesGuard.ts`, `src/shell/UnsavedChangesGuard.tsx` | The unsaved-edits guard (R-19): the hook, its dialog, and the one-line component a page mounts.

### Task R2-5a: Unsaved-changes guard

**Files:**
- Modify: `src/app-bridge.ts:40` (one re-export after `CtaButton`)
- Create: `src/shell/useUnsavedChangesGuard.ts`
- Create: `src/shell/UnsavedChangesGuard.tsx`
- Create: `src/shell/UnsavedChangesGuard.stories.tsx`
- Test: `src/shell/useUnsavedChangesGuard.test.tsx`
- Test: `src/shell/UnsavedChangesGuard.test.tsx`

**Interfaces:**
- **Consumes:**
  - `useBlocker` and the `Location` type from `react-router-dom` 7.18.4. `useBlocker` works under a data router only, and the app's router is one (`src/router.tsx:31`).
  - The app's `DialogShell`, newly bridged. It takes `isOpen`, `onClose`, `ariaLabel`, `size`, `initialFocusRef` and `panelStyle`.
  - `CtaButton`, `FONTS` and `SPACING` through the bridge.
  - `ADMIN_COLORS`, `ADMIN_RADIUS` and `ADMIN_TYPE` from `src/theme/adminTheme.ts`.
- **Produces:** the contract additions above.

**Design notes:**
1. **Why `DialogShell`, not `window.confirm`.** The rule allows a dialog, as long as it goes through the app's shell.
   - **What the rule checks.** `inkweave/no-unshelled-dialogs` (enabled in admin's `eslint.config.js`) reports any `aria-modal` in a file that imports none of `DialogShell`, `BottomSheet` or `useDialogFocus`. Today the bridge offers none of them, so a hand-built modal would also need the three overlay hooks.
   - **What bridging costs.** `DialogShell` is one bridge line. It imports only `shared/constants` and `shared/hooks`, which the bridge already loads.
   - **What it brings.** It carries the app's overlay contract (`.claude/rules/overlays.md` in the app):
     - a portal to `body` and the `COLORS.scrim` scrim;
     - `role="dialog"` with `aria-modal` and a required name;
     - a Tab trap, document-level Escape and focus restore;
     - a body scroll lock;
     - an unmount that is safe under reduced motion (a 400ms fallback).
   - **Why not `window.confirm`.** react-router ships a `window.confirm` helper, `unstable_usePrompt`, and keeps it unstable for good. Its own docs say it misbehaves in some browsers when Back or Forward is pressed while the confirm is open.
     - A native confirm also blocks the main thread and can't be styled.
     - jsdom doesn't implement it, so a test would stub it and never run the real UI.
   - **What the router recommends.** `useBlocker` with a UI the page owns, calling `proceed()` or `reset()`, is the documented pattern.
2. **By default, only a new pathname is leaving.** The blocker function is `dirty && leaves(currentLocation, nextLocation)`. The default `leaves` is `from.pathname !== to.pathname`, the comparison react-router's own `usePrompt` example uses.
   - These all land on the same page, which stays mounted with its edits:
     - a `?rule=` change;
     - the sidebar's own link to `/calibration`;
     - "Show all pairs".
   - Test 5 pins this.
   - **A page can say more navigations leave.** R4's studio keeps the card in `?card=`, and another card drops the Edit draft. So it passes its own `leaves` (the R4 hand-off), and test 6 pins that a search change is held when `leaves` says so.
3. **Edits that clear while a navigation is held end the hold as a stay.**
   - **When it happens.** The modal covers the page, so only a publish already in flight can clear the edits while the dialog is open.
   - **Why stay, not leave.** Staying keeps the publish's commit link and go-live note on screen. react-router's `usePrompt` resets in the same case.
   - **How.** `blocked` also reads `dirty`, so the render where the edits clear already shows no dialog. The effect's `reset()` stops a later edit from reopening the old navigation (test 8).
4. **`beforeunload` only while dirty.**
   - **Its own effect.** react-router's `useBeforeUnload` would keep a listener for the page's whole life. web.dev's bfcache guidance is to add one only while there are unsaved changes.
   - **What the handler does.** It calls `preventDefault()` and sets `returnValue = true`, which Chrome and Edge before 119 need.
   - **No message.** Browsers show their own wording, so the hook takes none.
5. **Focus.**
   - **Why not the Stay button.** `CtaButton`'s props are `ButtonHTMLAttributes`, with no `ref`: tsc rejects `<CtaButton ref={…}>` (checked). So `initialFocusRef` can't point at "Stay on this page".
   - **Focus goes to the message.** It points at the message, a `<p tabIndex={-1}>`. Message-first is a trade-off. `CtaButton` takes no `ref`, and `DialogShell` has no `aria-describedby`, so focusing the message is the only way a screen reader hears what leaving loses. APG would otherwise put focus on Stay. Either way, no single key press leaves. This is an owner flag (Re-base notes).
   - **No key press leaves.** Tab reaches "Stay on this page" first. Escape and the scrim call `onClose`, which stays.
   - **Focus restore.** On a stay, `useDialogFocus` hands focus back to the link that was followed.
6. **One guard per page, under a data router, mounted by the page.**
   - **One blocker.** The router holds one blocker at a time ("A router only supports one blocker at a time") and uses the newest.
   - **Data router only.** Under `MemoryRouter`, `useBlocker` throws "useBlocker must be used within a data router." So a test or story that renders a page with the guard uses `createMemoryRouter` with `RouterProvider`.
     - The tests that wrap pages in `MemoryRouter` today never mount it: `writePages.test.tsx`, `TuningPage.test.tsx`, R1's `analytics/__tests__/CalibrationPage.test.tsx` (deleted in R2-6), `OverviewPage.test.tsx`, `OverviewView.test.tsx`, `ActivityPage.test.tsx`, `WebAnalyticsPage.test.tsx` and `Sidebar.test.tsx`.
   - **Mounted by the page.** The page component mounts the guard, not a props-driven view, so the views' stories and tests still render without a router.
   - **No layout cost.** The dialog portals into `body`, so where it sits in the tree changes no layout. That includes `PageLayout`'s `flush` body.
7. **Look.**
   - **Panel.** The panel is the admin card fill layered over the page: opaque, as `adminTheme.ts` asks of anything that hides what is under it. It has a `strongBorder` edge, `ADMIN_RADIUS.panel` corners and `SPACING.xl` padding.
   - **Text.** The heading is Tinos at `ADMIN_TYPE.sectionTitle`. The message is `ADMIN_COLORS.muted` (data text is never `dim`, R-6).
   - **Buttons.** They are the app's kit: the filled CTA for the safe choice, neutral for leaving.
   - **Size.** `size="sm"`: the 360px preset, and the actions wrap if they don't fit.

- [ ] **Step 1: Write the failing hook test**

Create `src/shell/useUnsavedChangesGuard.test.tsx`.
- **Harness.** The page under test has an "Unsaved edits" checkbox, a link away and a link to itself with `?rule=ramp`, plus plain answer buttons that show while a navigation is held.
- **Lint.** Test files are exempt from `no-adhoc-buttons` and `no-unshelled-dialogs` (both rules' exempt lists match `.test.(ts|tsx)$`), and these buttons are unstyled anyway.

```tsx
import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {createMemoryRouter, Link, RouterProvider} from 'react-router-dom';
import {useUnsavedChangesGuard, type LeavesPage} from './useUnsavedChangesGuard';

/** A page with an "Unsaved edits" switch, links away and to itself, and the guard's answer buttons. */
function Editor({leaves}: {leaves?: LeavesPage}) {
  const [dirty, setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty, leaves);
  return (
    <>
      <h1>Editor</h1>
      <label>
        <input type="checkbox" checked={dirty} onChange={(e) => setDirty(e.target.checked)} />
        Unsaved edits
      </label>
      <Link to="/elsewhere">Elsewhere</Link>
      <Link to="/editor?rule=ramp">Ramp</Link>
      {guard.blocked && (
        <>
          <p>Held</p>
          <button type="button" onClick={guard.stay}>
            Stay
          </button>
          <button type="button" onClick={guard.leave}>
            Leave
          </button>
        </>
      )}
    </>
  );
}

/** useBlocker needs a data router, so the page renders in createMemoryRouter, as the app's createBrowserRouter. */
function renderEditor(initialEntries = ['/editor'], leaves?: LeavesPage) {
  const router = createMemoryRouter(
    [
      {path: '/editor', element: <Editor leaves={leaves} />},
      {path: '/elsewhere', element: <h1>Elsewhere</h1>},
    ],
    {initialEntries, initialIndex: initialEntries.length - 1},
  );
  const view = render(<RouterProvider router={router} />);
  return {router, unmount: view.unmount, user: userEvent.setup()};
}

/** Fires the event a tab close or reload sends, and says whether the page asked to stay. */
function unloadPrevented() {
  const event = new Event('beforeunload', {cancelable: true});
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

const editsSwitch = () => screen.getByRole('checkbox', {name: 'Unsaved edits'});

describe('useUnsavedChangesGuard', () => {
  it('lets a navigation through while there is nothing to lose', async () => {
    const {router, user} = renderEditor();
    await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
    expect(await screen.findByRole('heading', {name: 'Elsewhere'})).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it('holds a link to another page while there are unsaved edits', async () => {
    const {router, user} = renderEditor();
    await user.click(editsSwitch());
    await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
    expect(await screen.findByText('Held')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/editor');
  });

  it('stays, edits and all, when asked to', async () => {
    const {router, user} = renderEditor();
    await user.click(editsSwitch());
    await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
    await user.click(await screen.findByRole('button', {name: 'Stay'}));
    expect(screen.queryByText('Held')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/editor');
    expect(editsSwitch()).toBeChecked();
  });

  it('carries on to the held page when asked to leave', async () => {
    const {router, user} = renderEditor();
    await user.click(editsSwitch());
    await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
    await user.click(await screen.findByRole('button', {name: 'Leave'}));
    expect(await screen.findByRole('heading', {name: 'Elsewhere'})).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it("never holds a change to the same page's search, such as ?rule=", async () => {
    const {router, user} = renderEditor();
    await user.click(editsSwitch());
    await user.click(screen.getByRole('link', {name: 'Ramp'}));
    expect(router.state.location.search).toBe('?rule=ramp');
    expect(screen.queryByText('Held')).not.toBeInTheDocument();
    // The page stayed mounted, so its edits did too.
    expect(editsSwitch()).toBeChecked();
  });

  it('holds a search change too when the page says that leaves (R4: another card)', async () => {
    const {router, user} = renderEditor(['/editor'], (from, to) => from.pathname !== to.pathname || from.search !== to.search);
    await user.click(editsSwitch());
    await user.click(screen.getByRole('link', {name: 'Ramp'}));
    expect(await screen.findByText('Held')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it("holds the browser's Back too, and goes back once asked to leave", async () => {
    const {router, user} = renderEditor(['/elsewhere', '/editor']);
    await user.click(editsSwitch());
    await act(() => router.navigate(-1));
    expect(await screen.findByText('Held')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/editor');
    await user.click(screen.getByRole('button', {name: 'Leave'}));
    expect(await screen.findByRole('heading', {name: 'Elsewhere'})).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it('drops a hold once the edits clear, and does not raise it again', async () => {
    const {router, user} = renderEditor();
    await user.click(editsSwitch());
    await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
    expect(await screen.findByText('Held')).toBeInTheDocument();
    // A publish that lands while the question is open clears the edits.
    await user.click(editsSwitch());
    expect(screen.queryByText('Held')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/editor');
    // New edits don't bring back the old navigation.
    await user.click(editsSwitch());
    expect(screen.queryByText('Held')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/editor');
  });

  it('asks the browser to confirm a tab close or reload only while there are unsaved edits', async () => {
    const {user, unmount} = renderEditor();
    expect(unloadPrevented()).toBe(false);
    await user.click(editsSwitch());
    expect(unloadPrevented()).toBe(true);
    await user.click(editsSwitch());
    expect(unloadPrevented()).toBe(false);
    await user.click(editsSwitch());
    unmount();
    expect(unloadPrevented()).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/shell/useUnsavedChangesGuard.test.tsx`

Expected: FAIL. The hook doesn't exist yet:
```
 FAIL  src/shell/useUnsavedChangesGuard.test.tsx [ src/shell/useUnsavedChangesGuard.test.tsx ]
Error: Failed to resolve import "./useUnsavedChangesGuard" from "src/shell/useUnsavedChangesGuard.test.tsx". Does the file exist?
 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Step 3: Write the hook**

Create `src/shell/useUnsavedChangesGuard.ts`:

```ts
import {useEffect} from 'react';
import {useBlocker, type Location} from 'react-router-dom';

/** What a page with unsaved edits needs to ask before they are lost. */
export interface UnsavedChangesGuardState {
  /** A navigation to another page is on hold until stay() or leave(). */
  blocked: boolean;
  /** Cancels the held navigation: the page stays, edits and all. */
  stay: () => void;
  /** Lets the held navigation through, and the edits are lost. */
  leave: () => void;
}

/** Whether a navigation from one location to another leaves what the page guards. */
export type LeavesPage = (from: Location, to: Location) => boolean;

/** The default: only a new pathname leaves, so ?rule= and other search changes keep the page. */
const toAnotherPath: LeavesPage = (from, to) => from.pathname !== to.pathname;

/**
 * Guards unsaved edits (decision R-19). While `dirty`:
 * - a navigation that leaves (a sidebar link, the browser's Back) is held
 *   until the page answers with stay() or leave(). By default only a new
 *   pathname leaves: the same page with other search params (?rule=) keeps
 *   its state, so it is never held. A page whose search holds what it edits
 *   (R4's ?card=) passes its own `leaves`;
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

  return {
    // `dirty` too, so the render where the edits clear already shows no question.
    blocked: dirty && blocker.state === 'blocked',
    stay: () => blocker.reset?.(),
    leave: () => blocker.proceed?.(),
  };
}
```

- [ ] **Step 4: Run the hook test to PASS**

Run: `pnpm vitest run src/shell/useUnsavedChangesGuard.test.tsx`

Expected: PASS, `Tests  9 passed (9)`, with no warnings in the output.

- [ ] **Step 5: Write the failing dialog test**

Create `src/shell/UnsavedChangesGuard.test.tsx`.
- **The page.** It mounts the component the way R2-6's page will.
- **Timing.** `DialogShell` focuses its target 100ms after opening, and unmounts 400ms after closing when no `transitionend` fires (always, in jsdom). So the test waits with `waitFor` and `waitForElementToBeRemoved`, whose 1s default covers both. It needs no fake timers.

```tsx
import {render, screen, waitFor, waitForElementToBeRemoved, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {createMemoryRouter, Link, RouterProvider} from 'react-router-dom';
import {UnsavedChangesGuard} from './UnsavedChangesGuard';

const MESSAGE = "2 pending tuning edits aren't published yet. Leaving this page drops them.";

/** A page with an "Unsaved edits" switch and a link away, guarded as R2-6's page is. */
function Editor() {
  const [dirty, setDirty] = useState(false);
  return (
    <>
      <h1>Editor</h1>
      <label>
        <input type="checkbox" checked={dirty} onChange={(e) => setDirty(e.target.checked)} />
        Unsaved edits
      </label>
      <Link to="/elsewhere">Elsewhere</Link>
      <UnsavedChangesGuard dirty={dirty} message={MESSAGE} />
    </>
  );
}

function renderEditor() {
  const router = createMemoryRouter(
    [
      {path: '/editor', element: <Editor />},
      {path: '/elsewhere', element: <h1>Elsewhere</h1>},
    ],
    {initialEntries: ['/editor']},
  );
  render(<RouterProvider router={router} />);
  return {router, user: userEvent.setup()};
}

/** Stages an edit, then follows the link away, which the guard holds. */
async function tryToLeave(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('checkbox', {name: 'Unsaved edits'}));
  await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
  return screen.findByRole('dialog', {name: 'Leave this page?'});
}

describe('UnsavedChangesGuard', () => {
  it('asks nothing while there is nothing to lose', async () => {
    const {router, user} = renderEditor();
    await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
    expect(await screen.findByRole('heading', {name: 'Elsewhere'})).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it('asks in a modal dialog before a link leaves unsaved edits, and focuses what leaving loses', async () => {
    const {router, user} = renderEditor();
    const dialog = await tryToLeave(user);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('heading', {level: 2, name: 'Leave this page?'})).toBeInTheDocument();
    // A screen reader hears the message first, and no single key press leaves.
    await waitFor(() => expect(within(dialog).getByText(MESSAGE)).toHaveFocus());
    expect(router.state.location.pathname).toBe('/editor');
    await user.tab();
    expect(within(dialog).getByRole('button', {name: 'Stay on this page'})).toHaveFocus();
  });

  it('stays on the page with its edits, and hands focus back to the link', async () => {
    const {router, user} = renderEditor();
    const dialog = await tryToLeave(user);
    await user.click(within(dialog).getByRole('button', {name: 'Stay on this page'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.pathname).toBe('/editor');
    expect(screen.getByRole('checkbox', {name: 'Unsaved edits'})).toBeChecked();
    expect(screen.getByRole('link', {name: 'Elsewhere'})).toHaveFocus();
  });

  it('stays on Escape', async () => {
    const {router, user} = renderEditor();
    await tryToLeave(user);
    await user.keyboard('{Escape}');
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.pathname).toBe('/editor');
  });

  it('leaves when asked to', async () => {
    const {router, user} = renderEditor();
    const dialog = await tryToLeave(user);
    await user.click(within(dialog).getByRole('button', {name: 'Leave this page'}));
    expect(await screen.findByRole('heading', {name: 'Elsewhere'})).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/elsewhere');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run it and watch it fail**

Run: `pnpm vitest run src/shell/UnsavedChangesGuard.test.tsx`

Expected: FAIL. The component doesn't exist yet:
```
 FAIL  src/shell/UnsavedChangesGuard.test.tsx [ src/shell/UnsavedChangesGuard.test.tsx ]
Error: Failed to resolve import "./UnsavedChangesGuard" from "src/shell/UnsavedChangesGuard.test.tsx". Does the file exist?
 Test Files  1 failed (1)
```

- [ ] **Step 7: Bridge the app's DialogShell**

Edit `src/app-bridge.ts`, lines 39-41.

Before:
```ts
export {CardTranslationPanel} from '../upstream/inkweave/apps/web/src/shared/components/CardTranslationPanel';
export {CtaButton} from '../upstream/inkweave/apps/web/src/shared/components/CtaButton';
export {InkIcon} from '../upstream/inkweave/apps/web/src/shared/components/InkIcon';
```

After:
```ts
export {CardTranslationPanel} from '../upstream/inkweave/apps/web/src/shared/components/CardTranslationPanel';
export {CtaButton} from '../upstream/inkweave/apps/web/src/shared/components/CtaButton';
// The app's overlay contract (#510): portal, scrim, focus trap, Escape, focus
// restore and scroll lock. inkweave/no-unshelled-dialogs allows aria-modal only
// through it, so admin's dialogs render in it.
export {DialogShell} from '../upstream/inkweave/apps/web/src/shared/components/DialogShell';
export {InkIcon} from '../upstream/inkweave/apps/web/src/shared/components/InkIcon';
```

- [ ] **Step 8: Write the dialog and the guard component**

Create `src/shell/UnsavedChangesGuard.tsx`. It exports two components and nothing else, so `react-refresh/only-export-components` passes.

```tsx
import {useRef} from 'react';
import {CtaButton, DialogShell, FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';
import {useUnsavedChangesGuard, type LeavesPage} from './useUnsavedChangesGuard';

const TITLE = 'Leave this page?';

// DialogShell draws the app's surface. Admin's panel is the card fill layered
// over the page instead: opaque, as adminTheme.ts asks of anything that hides
// what is under it.
const PANEL: React.CSSProperties = {
  padding: SPACING.xl,
  background: `linear-gradient(${ADMIN_COLORS.card}, ${ADMIN_COLORS.card}), ${ADMIN_COLORS.page}`,
  border: `1px solid ${ADMIN_COLORS.strongBorder}`,
  borderRadius: ADMIN_RADIUS.panel,
  color: ADMIN_COLORS.text,
  fontFamily: FONTS.body,
};

const HEADING: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.sectionTitle,
  fontWeight: 400,
  lineHeight: 1.2,
};

// The message takes focus when the dialog opens, so a screen reader reads it.
// It is no control, so it draws no focus ring (DialogShell's panel draws none either).
const MESSAGE: React.CSSProperties = {
  margin: `${SPACING.sm}px 0 0`,
  fontSize: ADMIN_TYPE.body,
  lineHeight: 1.5,
  color: ADMIN_COLORS.muted,
  outline: 'none',
};

const ACTIONS: React.CSSProperties = {display: 'flex', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xl};
const ACTION: React.CSSProperties = {flex: '1 1 auto'};

interface UnsavedChangesDialogProps {
  open: boolean;
  /** What leaving loses, e.g. "2 pending tuning edits aren't published yet. Leaving this page drops them." */
  message: string;
  onStay: () => void;
  onLeave: () => void;
}

/**
 * Asks whether to leave a page with unsaved edits, in the app's DialogShell:
 * the overlay contract (focus trap, Escape, focus restore, scroll lock, a scrim
 * that closes). Every way out but "Leave this page" stays: the Stay button,
 * Escape and the scrim. Focus opens on the message, so a screen reader reads
 * what leaving loses and no single key press leaves; Tab reaches "Stay on this
 * page" first.
 */
export function UnsavedChangesDialog({open, message, onStay, onLeave}: UnsavedChangesDialogProps) {
  const messageRef = useRef<HTMLParagraphElement>(null);
  return (
    <DialogShell
      isOpen={open}
      onClose={onStay}
      ariaLabel={TITLE}
      size="sm"
      initialFocusRef={messageRef}
      panelStyle={PANEL}>
      <h2 style={HEADING}>{TITLE}</h2>
      <p ref={messageRef} tabIndex={-1} style={MESSAGE}>
        {message}
      </p>
      <div style={ACTIONS}>
        <CtaButton type="button" onClick={onStay} style={ACTION}>
          Stay on this page
        </CtaButton>
        <CtaButton type="button" variant="neutral" onClick={onLeave} style={ACTION}>
          Leave this page
        </CtaButton>
      </div>
    </DialogShell>
  );
}

interface UnsavedChangesGuardProps {
  /** The page holds edits that leaving would lose. */
  dirty: boolean;
  message: string;
  /** Which navigations leave (R4's card change in Edit). Defaults to a new pathname. */
  leaves?: LeavesPage;
}

/**
 * The one line a page with unsaved edits mounts (decision R-19): it asks before
 * a link or the browser's Back leaves them, and has the browser ask before a tab
 * close or reload. One per page, under a data router (useUnsavedChangesGuard).
 */
export function UnsavedChangesGuard({dirty, message, leaves}: UnsavedChangesGuardProps) {
  const guard = useUnsavedChangesGuard(dirty, leaves);
  return <UnsavedChangesDialog open={guard.blocked} message={message} onStay={guard.stay} onLeave={guard.leave} />;
}
```

- [ ] **Step 9: Run both tests to PASS**

Run: `pnpm vitest run src/shell/useUnsavedChangesGuard.test.tsx src/shell/UnsavedChangesGuard.test.tsx`

Expected: PASS, `Test Files  2 passed (2)` and `Tests  14 passed (14)`, with no warnings in the output.

- [ ] **Step 10: Add the story**

Create `src/shell/UnsavedChangesGuard.stories.tsx`.
- **What it shows.** The dialog open, with no router: `UnsavedChangesDialog` is props-driven.
- **Its callbacks.** They are no-ops, so Escape and the buttons leave it open, which is all a visual story needs.
- **When it gets looked at.** The phase's stories sweep looks at it, under "Admin/UnsavedChangesDialog".

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {UnsavedChangesDialog} from './UnsavedChangesGuard';

const meta: Meta<typeof UnsavedChangesDialog> = {
  title: 'Admin/UnsavedChangesDialog',
  component: UnsavedChangesDialog,
  args: {
    open: true,
    message: "2 pending tuning edits aren't published yet. Leaving this page drops them.",
    onStay: () => {},
    onLeave: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

/** What a page with unsaved edits asks when a link or the browser's Back would leave it (decision R-19). */
export const Open: Story = {};
```

- [ ] **Step 11: Lint, typecheck and the whole suite**

Run: `pnpm lint`
Expected: no problems. Each of the six files passed `pnpm exec eslint --stdin` against the repo config while drafting. That includes `no-unshelled-dialogs`: the dialog's `aria-modal` lives in the app's `DialogShell`, not here.

Run: `pnpm typecheck`
Expected: exit 0. `tsc -b` also compiles the newly bridged `DialogShell.tsx`.

Run: `pnpm test:run`
Expected: every test file passes. The bridge gains one export, and no existing test mounts the guard.

- [ ] **Step 12: Commit**

After the owner approves, with the Bash tool:
```bash
git add src/app-bridge.ts src/shell/useUnsavedChangesGuard.ts src/shell/useUnsavedChangesGuard.test.tsx src/shell/UnsavedChangesGuard.tsx src/shell/UnsavedChangesGuard.test.tsx src/shell/UnsavedChangesGuard.stories.tsx
USER_APPROVED=1 git commit -m "feat(shell): ask before leaving a page with unsaved edits (#24)"
```
Husky's pre-commit runs lint and the tests. If Vitest fails to start its workers under load, stop any preview servers, wait for other sessions' runs to finish, and retry.

### Hand-off: R2-6 (mounts it)

- **Mount the guard in `TunedWorkspace`** (`src/tools/analytics/calibration/CalibrationPage.tsx`), which owns `admin.pending`.
  - Don't mount it in `CalibrationWorkspace`. Its story and any test that renders it without a data router would throw.
  - The outline's `TunedWorkspace` becomes the block below, and its Consumes list gains `UnsavedChangesGuard`.
  - The block passes `pnpm exec eslint --stdin` inside the outline's `CalibrationPage.tsx`. It can't typecheck before R2-6 creates `CalibrationWorkspace`.
  ```tsx
  // CalibrationPage.tsx: one more import
  import {UnsavedChangesGuard} from '../../../shell/UnsavedChangesGuard';

  /** What leaving /calibration with pending edits loses (R-19). */
  const UNSAVED_TUNING = "Your pending tuning edits aren't published yet. Leaving this page drops them.";

  /** Both tuning hooks need a token, so they live below the gate, and so does the guard over their edits. */
  function TunedWorkspace({token, ...rest}: Omit<CalibrationWorkspaceProps, 'tuning'> & {token: string}) {
    const live = useLiveTuning(token);
    const admin = useTuningAdmin(token);
    return (
      <>
        <UnsavedChangesGuard dirty={admin.pending.length > 0} message={UNSAVED_TUNING} />
        <CalibrationWorkspace {...rest} tuning={{live, admin}} />
      </>
    );
  }
  ```
- **Tests for `CalibrationPage.test.tsx`.** Its `createMemoryRouter` harness gains a route to leave to, such as `{path: '/', element: <h1>Overview</h1>}`.
  - With a pending edit, `router.navigate('/')` opens the "Leave this page?" dialog. "Stay on this page" keeps `/calibration`, and the tray still lists the edit.
  - With a pending edit, picking another rule writes `?rule=` and opens no dialog. The edit stays pending.
  - After a successful publish clears the tray, `router.navigate('/')` goes straight through.
- **Tests that render `CalibrationPage` with a token** must use `createMemoryRouter`, never the `MemoryRouter` wrapper that `writePages.test.tsx` uses. The token mounts `TunedWorkspace`, and so the guard.
- **Forget token.** The sidebar's drops pending edits without asking (the header's noted limit). R-26's aside and tray button asks first with `window.confirm` (R2-5). `UnsavedChangesDialog` could replace that confirm if the owner wants one dialog.

### Hand-off: R4 (Card studio)

- **R4 drops its planned `useUnsavedGuard`** (`R4-card-studio.md:842`, and "The unsaved guard" at `:876-880`). Its `window.confirm` would be a second design for the same job.
- **One guard on the studio page.** The router keeps one blocker, so two guards would fight. `StudioWorkspace` mounts:
  ```tsx
  <UnsavedChangesGuard
    dirty={ctrl.dirty || edit.dirty}
    leaves={(from, to) => shouldBlockStudioNavigation(from, to, {reveal: ctrl.dirty, edit: edit.dirty})}
    message={studioUnsavedMessage}
  />
  ```
  - `shouldBlockStudioNavigation` takes `{pathname, search}` pairs, which react-router's `Location` satisfies. Its table (`:756-759`) then holds a change of card in Edit, and never a mode switch.
  - R4 words `studioUnsavedMessage` so it names what would be lost, as its outline asks.
  - `beforeunload` asks while either draft is dirty, as R4's outline asks.
  - A hold ends early only once nothing is dirty (design note 3). So an Edit save that lands while a card change is held leaves the dialog open if the New reveal draft is still dirty. Either answer is then safe: the card change no longer drops anything.
- **Redirects.** `/reveal` and `/image` redirecting to `/studio` (R-10) is entering the page, not leaving it, so nothing is held.

### Hand-off: R2 docs (R2-7)

CLAUDE.md's "The tools" section could gain one sentence: "A page that holds unsaved edits mounts one `UnsavedChangesGuard` (`src/shell/`). It needs the data router, so tests render that page with `createMemoryRouter`."

### Verified while drafting (2026-10-05)

The check ran in a scratch copy, outside the repo. It held `src/` at `c92e260` (the uncommitted plan edit touches no code), with `upstream/` and each `node_modules` entry linked read-only, and Vite's caches kept in the scratch folder. It was re-run after review on the code as it stands here (`scratchpad/r2-rebase/sandbox-fix-r25a`, files placed straight from this plan's blocks).
- **The failures.** Steps 2 and 6 failed as quoted.
- **The passes.** Step 4 passed 9/9, and Step 9 passed 14/14 with no console warnings.
- **The suite.** All of `src/` (82 files, 707 tests); `scripts/` tests are untouched by this task. In the re-run one unrelated case, `ActivityView.test.tsx`'s "opens on the last 30 days", hit Vitest's 5s timeout under load; that file then passed on its own, 17/17.
- **Types.** `tsc -p tsconfig.app.json --noEmit` exited 0 on all of `src/`, with the bridged `DialogShell` included.
- **Lint.** All six files passed `pnpm exec eslint --stdin` against the repo's config, and so did R2-6's `TunedWorkspace` block. The same check reported `no-unshelled-dialogs` on a stray `aria-modal`, which confirms the rule runs on stdin.
- **Mutations.** Three mutations each failed exactly the test meant to catch them:
  - a default `leaves` that always leaves failed "never holds a change to the same page's search";
  - ignoring the page's `leaves` failed "holds a search change too when the page says that leaves";
  - dropping the reset effect failed "drops a hold once the edits clear".
- **The ref.** `<CtaButton ref={…}>` fails tsc (TS2322), which is why the message takes first focus.
