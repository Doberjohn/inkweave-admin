> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

**Contract additions (R1-7)**

- **`GithubTokenGate` loses its `title` prop.** New signature: `export function GithubTokenGate(props: {onSave: (token: string) => void}): JSX.Element`. The page's `<h1>` now comes from `PageLayout`, so the gate shows an `<h2>` "GitHub token" and sits left-aligned in the page body, capped at 460px wide. R2's tuning aside and R4's studio render it the same way.
- **`RevealAdminController` and `ImageAdminController` drop `clearToken`.** The sidebar's token box is now the only place to forget the token.
- **Assumed from the other R1 tasks (no rename; these tests depend on them):**
  - `PageLayout` renders `title` as the page's only `<h1>` and `subtitle` as its own text element.
  - `PageLayout` (or `AdminShell`) renders the page's one `<main>` landmark.
  - `PageLayout`'s body is a single-column grid with a gap (README:42). Each child of a page fragment is spaced by that gap, with no margin of its own.
  - With `writes`, `BranchNotice` renders the branch in its own `<code>`, so `getByText('master')` finds it.
  - The sidebar's token box has a `<button>` named "Forget token". It shows on `isWritePath` routes whenever a token is saved, including when the sidebar is collapsed (there as a labelled button). `NAV_ITEMS` marks `/reveal`, `/image` and `/tuning` as `writes: true`.
  - `useGithubToken` is one module-level store. A `setToken` from any instance reaches every mounted page, including one from a `renderHook` outside the router tree.

### Task R1-7: Existing write tools inside the new layout

The reveal publisher, the card images tool and the engine tuning editor move inside `PageLayout`. The branch notice is on, and each page's own header is gone.

- Each page loses three things:
  - its `<h1>`;
  - its "Forget token" button (the sidebar's token box replaces it, README section 1);
  - its `<main>` wrapper with max-width and padding, which fought the body grid. The shell's `<main>` is the page's landmark now.
- Without a token, `GithubTokenGate` renders inside the same layout. The title and the branch notice stay above it.
- The tools' internals are not restyled. R2 and R4 do that.
- On wide screens the reveal form and the image picker now stretch with the body. That lasts until R4 replaces both with Card studio. R2 does the same for tuning.

**No existing test clicks a page's "Forget token".**
- `grep -rn "Forget token" src` lists the three pages' buttons. Every other hit is R1-6's sidebar: `Sidebar.tsx`, a comment in `AdminShell.tsx`, and the tests that click the sidebar's button (`Sidebar.test.tsx`, `AdminShell.test.tsx`).
- `TuningPage.test.tsx` renders with a token and never forgets it.
- `useRevealAdmin.test.ts` and `useImageAdmin.test.ts` mock `useGithubToken`.

So no existing test needs to move or be dropped. `AdminShell.test.tsx` still finds the tuning gate by its old h1, so Step 10 points it at the gate's button. The new router case in Step 2 covers the sidebar path end to end.

**Files:**
- Create: `src/tools/__tests__/writePages.test.tsx`
- Modify: `src/router.test.tsx`, as R1-6 wrote it
  - the `@testing-library/react` import (:1), plus one new import above `import {routes} from './router';` (:4)
  - `afterEach` (:21-25)
  - the `asks for a GitHub token before %s` case (:69-76). The earlier R1 tasks leave this case as is, because the gate's h1 only changes here.
- Modify: `src/router.tsx`, as R1-6 wrote it: the `WriteToolFrame` import (:4), the JSDoc (:10-15) and the three write routes (:23-46)
- Delete: `src/shell/WriteToolFrame.tsx` (R1-6's interim frame)
- Modify: `src/shell/AdminShell.test.tsx:28`, `:32`
- Modify: `src/shell/Sidebar.tsx:105-110` (the `TokenBox` JSDoc)
- Modify: `src/github/GithubTokenGate.tsx:5-10`, `:24-26`
- Modify: `src/github/GithubTokenGate.stories.tsx:7`
- Modify: `src/tools/reveal/RevealPage.tsx:1-10`, `:12-36`, `:82-86`
- Modify: `src/tools/image/ImagePage.tsx:1-4`, `:6-30`, `:65-69`
- Modify: `src/tools/tuning/TuningPage.tsx:1-5`, `:24-46`
- Modify: `src/tools/tuning/__tests__/TuningPage.test.tsx:2`, `:24`, `:34`
- Modify: `src/tools/reveal/useRevealAdmin.ts:74`, `:93`, `:141`
- Modify: `src/tools/image/useImageAdmin.ts:44`, `:59`, `:107`
- Test: `src/tools/__tests__/writePages.test.tsx`, `src/router.test.tsx`, `src/shell/AdminShell.test.tsx`
- Regression: `src/tools/{reveal,image,tuning}/__tests__/*`, `src/shell/*.test.*`

**Interfaces:**
- **Consumes:**
  - `PageLayout({title, subtitle, writes, children})` from `src/shell/PageLayout.tsx`. It renders `BranchNotice` when `writes` is set, and its body is a gapped single-column grid.
  - The shell's one `<main>` landmark, from `PageLayout` or `AdminShell`.
  - `useGithubToken(): UseGithubToken` from `src/github/useGithubToken.ts`, now a shared store.
  - The sidebar's token box ("Forget token") on write paths, open or collapsed.
  - Existing code: `targetBranch()`, `goLiveNote()`, `useRevealAdmin`, `useImageAdmin`, `useLiveTuning`, `TuningEditor`.
- **Produces:**
  - `RevealPage`, `ImagePage` and `TuningPage`, with the same exports and routes, now inside `PageLayout`.
  - `GithubTokenGate(props: {onSave})`.
  - `RevealAdminController` and `ImageAdminController` without `clearToken`.
- **Depends on:** the R1 tasks for shared token state, `nav.ts`/`Sidebar`, and `PageLayout`/`BranchNotice`/`AdminShell`.

- [ ] **Step 1: Write the failing page-layout test**

Create `src/tools/__tests__/writePages.test.tsx`:

```tsx
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {ComponentType} from 'react';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ImagePage} from '../image/ImagePage';
import {RevealPage} from '../reveal/RevealPage';
import {TuningPage} from '../tuning/TuningPage';

// The token each test hands the pages. The mock's clearToken is a no-op:
// forgetting the token is the sidebar's job now (router.test.tsx covers that).
const saved = vi.hoisted(() => ({token: null as string | null}));
vi.mock('../../github/useGithubToken', () => ({
  useGithubToken: () => ({token: saved.token, setToken: () => {}, clearToken: () => {}}),
}));
// An empty card list; the rest of the bridge stays real.
vi.mock('../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app-bridge')>()),
  useCardDataContext: () => ({cards: []}),
}));

const PAGES: Array<[title: string, Page: ComponentType, subtitle: string]> = [
  ['Reveal publisher', RevealPage, 'Add a newly revealed card to the preview set.'],
  ['Card images', ImagePage, "Replace an existing card's image."],
  ['Engine tuning', TuningPage, 'Edit playstyle copy and the Shift and Ramp scores.'],
];

beforeEach(() => {
  // With a token, the tuning page reads tuning.json. That read never settles here.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
});

afterEach(() => {
  saved.token = null;
  vi.unstubAllGlobals();
});

// Every page renders under the router in the app.
describe.each(PAGES)('%s', (title, Page, subtitle) => {
  it('renders inside the page layout, which names the branch it writes to', () => {
    saved.token = 'tok';
    render(<Page />, {wrapper: MemoryRouter});
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
    expect(screen.getByText(subtitle)).toBeInTheDocument();
    expect(screen.getByText('master')).toBeInTheDocument();
  });

  it('leaves Forget token to the sidebar', () => {
    saved.token = 'tok';
    render(<Page />, {wrapper: MemoryRouter});
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
  });

  it('asks for a token under the same title and branch notice', () => {
    render(<Page />, {wrapper: MemoryRouter});
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'GitHub token'})).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub token')).toBeInTheDocument();
    expect(screen.getByText('master')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Update the router test for the new titles, the sidebar's Forget token and the one main landmark**

In `src/router.test.tsx`, as R1-6 wrote it, make four edits. The line numbers are R1-6's; each edit moves the lines after it, so match each block by its text.

Replace line 1:

```ts
import {render, screen, within} from '@testing-library/react';
```

with:

```ts
import {act, render, renderHook, screen, within} from '@testing-library/react';
```

R1-6 already imports `userEvent`. Add one import above `import {routes} from './router';`:

```ts
import {useGithubToken} from './github/useGithubToken';
```

Replace `afterEach` (:21-25):

```ts
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
});
```

with:

```ts
afterEach(() => {
  // The token store is module-level: a case that fails before its Forget-token
  // click would otherwise hand its token to every later case. Clear it while the
  // page is still mounted and fetch is still stubbed.
  act(() => renderHook(() => useGithubToken()).result.current.clearToken());
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  // The sidebar's collapsed state persists in localStorage.
  localStorage.clear();
});
```

R1-6's `localStorage.clear()` stays, but it does not reset the in-memory token store, so the token lines go in ahead of it.

Replace the token case (:69-76):

```ts
  it.each([
    ['/reveal', 'Reveal admin'],
    ['/image', 'Card image admin'],
    ['/tuning', 'Tuning admin'],
  ])('asks for a GitHub token before %s', (path, title) => {
    renderAt(path);
    expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
  });
```

with:

```ts
  const WRITE_PAGES: Array<[path: string, title: string]> = [
    ['/reveal', 'Reveal publisher'],
    ['/image', 'Card images'],
    ['/tuning', 'Engine tuning'],
  ];

  it.each(WRITE_PAGES)('asks for a GitHub token on %s, under the page title', (path, title) => {
    renderAt(path);
    expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Save token'})).toBeInTheDocument();
  });

  // The write pages have no Forget token of their own any more (README section 1).
  // The sidebar's is the only one, and the shared token state carries it to the page.
  it.each(WRITE_PAGES)("returns %s to the token gate from the sidebar's Forget token", async (path, title) => {
    const user = userEvent.setup();
    const saved = renderHook(() => useGithubToken());
    act(() => saved.result.current.setToken('tok'));
    renderAt(path);
    expect(screen.queryByRole('button', {name: 'Save token'})).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Save token'})).toBeInTheDocument();
  });

  // One main landmark per page, whether the gate or the tool fills the body. The
  // pages used to bring their own <main>.
  it.each(WRITE_PAGES)('keeps %s in one main landmark, before and after a token is saved', (path) => {
    const saved = renderHook(() => useGithubToken());
    renderAt(path);
    expect(screen.getAllByRole('main')).toHaveLength(1);

    act(() => saved.result.current.setToken('tok'));
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });
```

`getByRole('button', {name: 'Forget token'})` throws if the page still has its own button next to the sidebar's. That is the check that the per-page buttons are gone.

The main-landmark case checks both states in one render: the gate first, then the tool once the token is saved. Today's pages break one of the two, wherever the shell keeps its `<main>`.

- [ ] **Step 3: Run the tests to see them fail**

Run: `pnpm vitest run src/tools/__tests__/writePages.test.tsx src/router.test.tsx`

The engine must already be built. On a fresh clone, run `pnpm build:engine` first.

Expected: FAIL.
- **writePages:** 9 failed.
  - "renders inside the page layout…" fails with ``Unable to find an accessible element with the role "heading" and name `Reveal publisher` ``, and likewise for `Card images` and `Engine tuning`. The pages still render "Add a reveal card", "Update a card image" and "Tuning editor".
  - "leaves Forget token to the sidebar" fails with `expect(element).not.toBeInTheDocument()`, because the page's button is found.
  - "asks for a token…" fails on the h1 name. Today's gate titles are "Reveal admin", "Card image admin" and "Tuning admin".
- **router:**
  - The three `asks for a GitHub token on …` cases fail the same way.
  - The three `returns … to the token gate` cases fail with `Found multiple elements with the role "button" and name "Forget token"`: the page's button and the sidebar's.
  - The three `keeps … in one main landmark` cases fail. Which assertion fails depends on where the shell task put the `<main>`:
    - **`AdminShell`:** the second assertion fails with `to have a length of 1 but got 2`. The page's own `<main>` sits inside the shell's.
    - **`PageLayout`:** the first assertion throws `Unable to find an accessible element with the role "main"`. Today's gate has no `<main>`, and the pages don't render `PageLayout` yet.
  - Every other router case passes. The `afterEach` clears the token that a failed case leaves behind.

- [ ] **Step 4: Give the gate an h2 and drop its title**

In `src/github/GithubTokenGate.tsx`, replace :5-10:

```tsx
interface GithubTokenGateProps {
  title: string;
  onSave: (token: string) => void;
}

export function GithubTokenGate({title, onSave}: GithubTokenGateProps) {
```

with:

```tsx
interface GithubTokenGateProps {
  onSave: (token: string) => void;
}

/**
 * Asks for a token before a write tool opens. It renders in the page body, under
 * the page's own title and branch notice, so its heading is an h2.
 */
export function GithubTokenGate({onSave}: GithubTokenGateProps) {
```

Replace :24-26:

```tsx
  return (
    <div style={{maxWidth: 460, margin: '0 auto', padding: SPACING.lg, color: COLORS.text}}>
      <h1 style={{fontSize: FONT_SIZES.xxl}}>{title}</h1>
```

with:

```tsx
  return (
    <div style={{maxWidth: 460}}>
      <h2 style={{fontSize: FONT_SIZES.xl, margin: 0}}>GitHub token</h2>
```

What changes in the gate:
- The page body supplies the padding, and the gate lines up with the header instead of centring.
- The 460px cap keeps the token field readable.
- Text colour comes from the shell.
- `COLORS` and `SPACING` stay imported, because the paragraph, the input and the error still use them.

In `src/github/GithubTokenGate.stories.tsx`, replace :7:

```tsx
  args: {title: 'Card image admin', onSave: () => {}},
```

with:

```tsx
  args: {onSave: () => {}},
```

Run: `pnpm exec eslint src/github/GithubTokenGate.tsx src/github/GithubTokenGate.stories.tsx`
Expected: no output.

- [ ] **Step 5: Reveal publisher inside the page layout**

In `src/tools/reveal/RevealPage.tsx`, replace the imports (:1-10):

```tsx
import {COLORS, SPACING, FONT_SIZES, RADIUS, CtaButton} from '../../app-bridge';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {targetBranch} from '../../github/githubCommit';
import {goLiveNote} from '../../github/goLiveNote';
import {
  useRevealAdmin,
  RevealAdminForm,
  CardPreviewPanel,
  SynergyPreviewPanel,
} from './index';
```

with:

```tsx
import {COLORS, SPACING, FONT_SIZES, RADIUS, CtaButton} from '../../app-bridge';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {targetBranch} from '../../github/githubCommit';
import {goLiveNote} from '../../github/goLiveNote';
import {PageLayout} from '../../shell/PageLayout';
import {
  useRevealAdmin,
  RevealAdminForm,
  CardPreviewPanel,
  SynergyPreviewPanel,
  type RevealAdminController,
} from './index';
```

Replace :12-36, which hold the page opening, the gate, the `<main>` wrapper, the h1, Forget token and the banner's margin:

```tsx
export function RevealPage() {
  const ctrl = useRevealAdmin();

  if (!ctrl.token) {
    return <GithubTokenGate title="Reveal admin" onSave={ctrl.setToken} />;
  }

  return (
    <main style={{maxWidth: 1000, margin: '0 auto', padding: SPACING.lg, color: COLORS.text}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1 style={{fontSize: FONT_SIZES.xxl}}>Add a reveal card</h1>
        <CtaButton
          variant="neutral"
          onClick={ctrl.clearToken}
          style={{minHeight: 0, padding: '6px 10px', fontSize: FONT_SIZES.sm}}>
          Forget token
        </CtaButton>
      </div>

      {ctrl.result && (
        <div
          role="status"
          style={{
            margin: `${SPACING.md}px 0`,
            padding: SPACING.md,
```

with:

```tsx
/** The commit banner, the form and its previews, once a token is saved. */
function RevealTool({ctrl}: {ctrl: RevealAdminController}) {
  return (
    <>
      {ctrl.result && (
        <div
          role="status"
          style={{
            padding: SPACING.md,
```

The fragment's children become items of the body grid. The grid gap now spaces the banner (see the body-grid assumption above), so the banner's margin goes. The indentation of :37-81 is unchanged.

Replace the closing lines (:82-86):

```tsx
        </aside>
      </div>
    </main>
  );
}
```

with:

```tsx
        </aside>
      </div>
    </>
  );
}

/**
 * The reveal publisher, inside the page layout that names the branch it writes
 * to. The sidebar's token box forgets the token; the gate then takes the tool's
 * place under the same header.
 */
export function RevealPage() {
  const ctrl = useRevealAdmin();
  return (
    <PageLayout title="Reveal publisher" subtitle="Add a newly revealed card to the preview set." writes>
      {ctrl.token ? <RevealTool ctrl={ctrl} /> : <GithubTokenGate onSave={ctrl.setToken} />}
    </PageLayout>
  );
}
```

(`writes` is `writes={true}`.)

Run: `pnpm exec eslint src/tools/reveal/RevealPage.tsx`
Expected: no output.

Run: `pnpm vitest run src/tools/__tests__/writePages.test.tsx -t "Reveal publisher"`
Expected: PASS (3 tests).

- [ ] **Step 6: Card images inside the page layout**

In `src/tools/image/ImagePage.tsx`, replace the imports (:1-4):

```tsx
import {COLORS, SPACING, FONT_SIZES, RADIUS, CtaButton} from '../../app-bridge';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {goLiveNote} from '../../github/goLiveNote';
import {useImageAdmin, CardImagePicker, UploadColumn} from './index';
```

with:

```tsx
import {COLORS, SPACING, FONT_SIZES, RADIUS} from '../../app-bridge';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {goLiveNote} from '../../github/goLiveNote';
import {PageLayout} from '../../shell/PageLayout';
import {useImageAdmin, CardImagePicker, UploadColumn, type ImageAdminController} from './index';
```

`CtaButton` was used only for Forget token on this page. Publish lives in `UploadColumn`.

Replace :6-30:

```tsx
export function ImagePage() {
  const ctrl = useImageAdmin();

  if (!ctrl.token) {
    return <GithubTokenGate title="Card image admin" onSave={ctrl.setToken} />;
  }

  return (
    <main style={{maxWidth: 900, margin: '0 auto', padding: SPACING.lg, color: COLORS.text}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1 style={{fontSize: FONT_SIZES.xxl}}>Update a card image</h1>
        <CtaButton
          variant="neutral"
          onClick={ctrl.clearToken}
          style={{minHeight: 0, padding: '6px 10px', fontSize: FONT_SIZES.sm}}>
          Forget token
        </CtaButton>
      </div>

      {ctrl.result && (
        <div
          role="status"
          style={{
            margin: `${SPACING.md}px 0`,
            padding: SPACING.md,
```

with:

```tsx
/** The commit banner, the card picker and the upload column, once a token is saved. */
function ImageTool({ctrl}: {ctrl: ImageAdminController}) {
  return (
    <>
      {ctrl.result && (
        <div
          role="status"
          style={{
            padding: SPACING.md,
```

As on the reveal page, the body grid's gap spaces the banner. The indentation of :31-64 is unchanged.

Replace the closing lines (:65-69):

```tsx
        />
      </div>
    </main>
  );
}
```

with:

```tsx
        />
      </div>
    </>
  );
}

/**
 * Card images: replace a card's art, inside the page layout that names the
 * branch it writes to. The sidebar's token box forgets the token; the gate then
 * takes the tool's place under the same header.
 */
export function ImagePage() {
  const ctrl = useImageAdmin();
  return (
    <PageLayout title="Card images" subtitle="Replace an existing card's image." writes>
      {ctrl.token ? <ImageTool ctrl={ctrl} /> : <GithubTokenGate onSave={ctrl.setToken} />}
    </PageLayout>
  );
}
```

Run: `pnpm exec eslint src/tools/image/ImagePage.tsx`
Expected: no output.

Run: `pnpm vitest run src/tools/__tests__/writePages.test.tsx -t "Card images"`
Expected: PASS (3 tests).

- [ ] **Step 7: Engine tuning inside the page layout**

In `src/tools/tuning/TuningPage.tsx`, replace :1-5:

```tsx
import {COLORS, SPACING, FONT_SIZES, CtaButton} from '../../app-bridge';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {targetBranch} from '../../github/githubCommit';
import {useGithubToken} from '../../github/useGithubToken';
import {TuningEditor} from './index';
```

with:

```tsx
import {COLORS, FONT_SIZES} from '../../app-bridge';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {targetBranch} from '../../github/githubCommit';
import {useGithubToken} from '../../github/useGithubToken';
import {PageLayout} from '../../shell/PageLayout';
import {TuningEditor} from './index';
```

Replace :24-46:

```tsx
export function TuningPage() {
  const {token, setToken, clearToken} = useGithubToken();

  if (!token) {
    return <GithubTokenGate title="Tuning admin" onSave={setToken} />;
  }

  return (
    <main style={{maxWidth: 1000, margin: '0 auto', padding: SPACING.lg, color: COLORS.text}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1 style={{fontSize: FONT_SIZES.xxl}}>Tuning editor</h1>
        <CtaButton
          variant="neutral"
          onClick={clearToken}
          style={{minHeight: 0, padding: '6px 10px', fontSize: FONT_SIZES.sm}}>
          Forget token
        </CtaButton>
      </div>

      <LiveTuningEditor token={token} />
    </main>
  );
}
```

with:

```tsx
/**
 * Engine tuning, inside the page layout that names the branch it writes to. The
 * sidebar's token box forgets the token; the gate then takes the editor's place
 * under the same header.
 */
export function TuningPage() {
  const {token, setToken} = useGithubToken();
  return (
    <PageLayout title="Engine tuning" subtitle="Edit playstyle copy and the Shift and Ramp scores." writes>
      {token ? <LiveTuningEditor token={token} /> : <GithubTokenGate onSave={setToken} />}
    </PageLayout>
  );
}
```

`LiveTuningEditor` (:8-22) is unchanged and still uses `COLORS`, `FONT_SIZES` and `targetBranch`. Line 6 (`import {useLiveTuning} from './useLiveTuning';`) stays.

The page now renders inside the layout, so its existing test renders it under a router, as the app does. In `src/tools/tuning/__tests__/TuningPage.test.tsx`, after :2 (`import {render, screen} from '@testing-library/react';`) add:

```tsx
import {MemoryRouter} from 'react-router-dom';
```

Then replace both occurrences (:24 and :34) of:

```tsx
    render(<TuningPage />);
```

with:

```tsx
    render(<TuningPage />, {wrapper: MemoryRouter});
```

Use Edit with `replace_all`. Don't touch the file's token setup (`beforeEach`/`afterEach`): the shared-token task owns it.

Run: `pnpm exec eslint src/tools/tuning/TuningPage.tsx src/tools/tuning/__tests__/TuningPage.test.tsx`
Expected: no output.

Run: `pnpm vitest run src/tools/__tests__/writePages.test.tsx -t "Engine tuning"`
Expected: PASS (3 tests).

Run: `pnpm vitest run src/tools/tuning/__tests__/TuningPage.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 8: Drop `clearToken` from the two controllers**

No page calls `clearToken` any more. The sidebar forgets the token through the shared store.

In `src/tools/reveal/useRevealAdmin.ts`, replace:

```ts
  setToken: (t: string) => void;
  clearToken: () => void;
  form: RevealCardForm;
```

with:

```ts
  setToken: (t: string) => void;
  form: RevealCardForm;
```

Replace (:93):

```ts
  const {token, setToken, clearToken} = useGithubToken();
```

with:

```ts
  const {token, setToken} = useGithubToken();
```

Replace (:139-142):

```ts
    token,
    setToken,
    clearToken,
    form,
```

with:

```ts
    token,
    setToken,
    form,
```

In `src/tools/image/useImageAdmin.ts`, replace:

```ts
  setToken: (t: string) => void;
  clearToken: () => void;
  cards: LorcanaCard[];
```

with:

```ts
  setToken: (t: string) => void;
  cards: LorcanaCard[];
```

Replace (:59):

```ts
  const {token, setToken, clearToken} = useGithubToken();
```

with:

```ts
  const {token, setToken} = useGithubToken();
```

Replace (:105-108):

```ts
    token,
    setToken,
    clearToken,
    cards,
```

with:

```ts
    token,
    setToken,
    cards,
```

The mocks in `useRevealAdmin.test.ts:9-10` and `useImageAdmin.test.ts:9-10` still return `clearToken`. The hooks ignore it, so the mocks stay as they are.

Run: `pnpm exec eslint src/tools/reveal/useRevealAdmin.ts src/tools/image/useImageAdmin.ts`
Expected: no output.

- [ ] **Step 9: Take the write routes out of `WriteToolFrame`**

Each page now renders `PageLayout writes`, which names the branch. R1-6's interim `WriteToolFrame` still wraps the three routes and renders a second `BranchNotice`. R1-6's `names the branch %s writes to` and `names a rehearsal branch when one is set` router cases would then fail with "Found multiple elements".

In `src/router.tsx`, as R1-6 wrote it, delete line 4:

```tsx
import {WriteToolFrame} from './shell/WriteToolFrame';
```

Replace the JSDoc (:10-15):

```tsx
/**
 * Admin's routes. Every one renders inside AdminShell, whose sidebar links them
 * (src/shell/nav.ts). The write tools keep their own pages for now, framed with
 * the branch notice; the redesign rebuilds them in R2 (tuning) and R4 (reveal,
 * image).
 */
```

with:

```tsx
/** Admin's routes. Every one renders inside AdminShell, whose sidebar links them (src/shell/nav.ts). */
```

Replace the three write routes (:23-46):

```tsx
      {
        path: 'reveal',
        element: (
          <WriteToolFrame>
            <RevealPage />
          </WriteToolFrame>
        ),
      },
      {
        path: 'image',
        element: (
          <WriteToolFrame>
            <ImagePage />
          </WriteToolFrame>
        ),
      },
      {
        path: 'tuning',
        element: (
          <WriteToolFrame>
            <TuningPage />
          </WriteToolFrame>
        ),
      },
```

with:

```tsx
      {path: 'reveal', element: <RevealPage />},
      {path: 'image', element: <ImagePage />},
      {path: 'tuning', element: <TuningPage />},
```

The `Navigate` import, the index redirect and the `analytics` route stay as they are, because R1-8 quotes them.

Then delete the frame. Run (Bash):

```bash
git rm src/shell/WriteToolFrame.tsx
git grep -n "WriteToolFrame" -- src
```

Expected: `rm 'src/shell/WriteToolFrame.tsx'`, then no output from `git grep` (exit 1).

Run: `pnpm exec eslint src/router.tsx`
Expected: no output.

- [ ] **Step 10: Point the shell's token test and the token box's note at the new pages**

R1-6's `src/shell/AdminShell.test.tsx` finds the tuning gate by its old h1, `Tuning admin`. Steps 4 and 7 removed that h1: the page's h1 is now `Engine tuning` with or without a token, and the gate's heading is an h2. The test finds the gate by its button instead.

Replace :28:

```tsx
    expect(screen.queryByRole('heading', {name: 'Tuning admin'})).not.toBeInTheDocument();
```

with:

```tsx
    expect(screen.queryByRole('button', {name: 'Save token'})).not.toBeInTheDocument();
```

Replace :32:

```tsx
    expect(screen.getByRole('heading', {level: 1, name: 'Tuning admin'})).toBeInTheDocument();
```

with:

```tsx
    expect(screen.getByRole('button', {name: 'Save token'})).toBeInTheDocument();
```

In `src/shell/Sidebar.tsx`, replace the `TokenBox` JSDoc (:105-110):

```tsx
/**
 * The saved token's status and a Forget token control. Token state is shared
 * (useGithubToken), so forgetting it here sends the open page back to its
 * token gate. The write pages keep their own Forget token buttons until they
 * are rebuilt (tuning in R2, reveal and image in R4), and both stay in step.
 */
```

with:

```tsx
/**
 * The saved token's status and a Forget token control. Token state is shared
 * (useGithubToken), so forgetting it here sends the open page back to its
 * token gate. It is the only Forget token: the write pages have none of their
 * own.
 */
```

Run: `pnpm exec eslint src/shell/AdminShell.test.tsx src/shell/Sidebar.tsx`
Expected: no output.

- [ ] **Step 11: Run the new tests to see them pass**

Run: `pnpm vitest run src/tools/__tests__/writePages.test.tsx src/router.test.tsx src/shell`
Expected: PASS.
- writePages has 9 tests.
- The router file passes in full, including the 9 write-page cases (gate, sidebar Forget token, main landmark). R1-6's two branch-notice cases find a single notice again.
- The `src/shell` suites pass, `AdminShell.test.tsx` with its Save token assertions.

- [ ] **Step 12: Run the tools' and GitHub layer's tests**

Run: `pnpm vitest run src/tools/reveal src/tools/image src/tools/tuning src/github`
Expected: PASS. These suites test the hooks and components that the pages wrap, which this task doesn't change.

- [ ] **Step 13: Lint and typecheck**

Run: `pnpm lint`
Expected: no errors.

Run: `pnpm typecheck`
Expected: exit 0. A leftover `title=` on `GithubTokenGate`, or a leftover `ctrl.clearToken`, would fail here.

- [ ] **Step 14: Check it in the browser (the owner pastes the token; never type one)**

1. Run `pnpm dev` and open `http://localhost:5180/reveal`, `/image` and `/tuning` with no token saved.
   - The page header shows each page's title, its one-line subtitle and the "Writes to Doberjohn/inkweave `master`" notice.
   - The gate ("GitHub token", the field, "Save token") sits under the header, left-aligned.
   - The sidebar shows no token box.
2. Ask the owner to save their token on `/reveal`. The sidebar's token box appears, and the tool fills the body on all three pages. No page has its own Forget token.
3. On `/image`, the owner clicks the sidebar's "Forget token". The page drops back to the gate under the same header.
4. The owner saves the token again on `/reveal`. Collapse the sidebar there.
   - Forget token is still reachable, as a labelled button: Tab reaches it, and its name reads "Forget token".
   - The owner clicks it, and the page returns to the gate.
   - Expand the sidebar again.
5. Stop the dev server before committing: the pre-commit Vitest run fails to start its workers under load.

- [ ] **Step 15: Commit**

Run with the Bash tool, only after the owner approves. Step 9's `git rm` already staged the frame's deletion.

```bash
git add src/tools/__tests__/writePages.test.tsx src/router.tsx src/router.test.tsx src/shell/AdminShell.test.tsx src/shell/Sidebar.tsx src/github/GithubTokenGate.tsx src/github/GithubTokenGate.stories.tsx src/tools/reveal/RevealPage.tsx src/tools/reveal/useRevealAdmin.ts src/tools/image/ImagePage.tsx src/tools/image/useImageAdmin.ts src/tools/tuning/TuningPage.tsx src/tools/tuning/__tests__/TuningPage.test.tsx
USER_APPROVED=1 git commit -m "feat(tools): render the write tools inside the page layout (#24)"
```

<!-- rejected (in part): note 2. Its "fails with a length of 2 before R1-7" holds only if AdminShell holds the <main>. If PageLayout holds it, the suggested token-only case already passes before R1-7. The case now checks the gate state first and then the tool state in one render, so it fails before R1-7 in either layout and passes after. Separately, the afterEach in note 1 now clears the token before unstubbing fetch, while the page is still mounted. -->
