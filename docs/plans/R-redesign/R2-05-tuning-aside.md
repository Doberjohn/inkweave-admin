> Part of [R: Admin redesign](../R-redesign.md), phase R2 ([R2-calibration-tuning.md](R2-calibration-tuning.md)). Read the main plan's decisions (R-17 to R-26 for R2), corrections, global constraints and shared interfaces, then the R2 header, first.

> **Re-base notes (R2-5, 2026-10-05).** Checked against `main` @ c92e260 (R1 as built), pin `upstream/inkweave` @ bc877e1, decisions R-17 to R-26, the re-based phase header (contract addition 10) and R2-2's hand-off to this task. What changed from the 2026-10-01 outline, and why:
> 1. **The contract comes from the header and R2-2.**
>    - `TuningState.live` is `ReturnType<typeof useLiveTuning>`, R2-2's `UseLiveTuningResult`, whose `reload` resolves with the config it read.
>    - `TuningAside` gains `onForgetToken`. R2-6 passes the shared store's `clearToken`.
>    - `PendingTray` gains `onReload?: () => void` and `onForgetToken?: () => void`. Each is offered only for its own `tuningFailureKind` ('stale-value', 'rejected-token').
>    - R2-5 doesn't touch `useLiveTuning`, `useTuningAdmin` or the failure kinds: R2-2 owns them.
> 2. **`GithubTokenGate` is used as it is.** R1-7 already renders it in the page body, with an h2 "GitHub token" and no centring, so the outline's `inline` prop and `title="Tuning editor"` are gone.
>    - **One addition:** a "Tuning editor" eyebrow above the gate. The gate's text never says what the token opens, and the eyebrow sits above the gate's h2 without replacing it; the landmark's name still comes from R2-6's `<aside aria-label="Tuning editor">`.
>    - The no-token test reads the gate's own h2.
> 3. **R-21, the shared-entry header.**
>    - The eyebrow reads "{Playstyle | Direct synergy} · tuning.json". The h2 is the entry's `tuningName`, in Tinos at 28px, with the gap in Tinos beside it.
>    - The gap is labelled "Gap", or "{rule name} gap" when the rule's name isn't the entry's (Location Boost under Locations, Lore Loss under Lore Denial). The read line takes the rule-name prefix under the same condition.
>    - "Shared by N rules: …" lists the names when `sharedWith` has two or more.
> 4. **R-18, as R2-2 handed it off.**
>    - **The count:** the aside keeps `dropped` (`number | null`). "Reload tuning.json" runs `live.reload().then((config) => config && setDropped(admin.dropStale(config)))`, and a publish sets the count back to null first.
>    - **The wording:** it lives in a pure `reloadNote.ts`, unit-tested, with R2-2's three sentences.
>    - **The line:** one `<div role="status">` is mounted with the tray and holds the note while the count is set. The outline's `admin.reset(); live.reload()` is gone.
>    - **Beyond the hand-off:** focus moves to that line after a reload, because the Reload button unmounts with the error it answered (WCAG 2.4.3). The line is `tabIndex={-1}`.
> 5. **R-26, as header addition 10 has it.**
>    - **Where:** "Forget token" sits under a read error whose kind is 'rejected-token', and in the tray for a publish error of that kind.
>    - **The confirm:** `TuningAside` wraps `onForgetToken` once. With edits pending, the wrapper first asks ``window.confirm(`Forget the token and drop ${n} unpublished edit${n === 1 ? '' : 's'}?`)``.
>    - **The line:** a small presentational `src/github/ForgetTokenOffer.tsx` draws "GitHub rejected the saved token. [Forget token] to enter a new one." The aside and the tray share it, and R4 can reuse it.
>    - **The confirm UI:** this stays `window.confirm`, as the header specifies. R2-5a's dialog replaces only the navigation guard's confirm (addition 11), and R2-5a lands after this task. Moving this confirm onto R2-5a's dialog too would be a later change, for the owner to decide.
> 6. **R-20.** The aside's "no entry" state now leads with "No copy in tuning.json". The outline had "{name} has no copy or scores in tuning.json".
> 7. **Missed by the outline.** `PendingTray`'s button becomes `Publish to {targetBranch()}`, so `TuningEditor.test.tsx`'s two `{name: 'Publish'}` lookups (lines 51 and 61; R2-2 leaves that file alone) would fail. Step 3 updates them, because `TuningEditor` lives until R2-7.
>    - The tray drops its own top border and margin, which the aside's pinned foot now draws.
>    - `TierRow` drops its bottom margin, which the aside's body gap now provides.
>    - So `/tuning`'s old editor looks tighter until R2-6 redirects it.
> 8. **R1's deferred minor from R1-7, "tuning loading `<p>` keeps default margins", is closed here:** the aside's loading line has `margin: 0`.
> 9. **Line numbers after R2-2.** `EditableRow` is `TuningEditor.tsx:20-55`, and `publishThenRefresh` is `:66`. The copy in `TuningAside` takes a `name` prop.
> 10. **Pin bc877e1, re-checked.**
>     - `TuningConfig` is unchanged (`packages/synergy-engine/src/data/tuning.ts:8-15`).
>     - `tuning.json` has 22 playstyles, with `location-control` named "Locations". `directRules` holds only `shift-targets`, and `ruleTexts` holds `shift-targets` (13 tiers) and `ramp`.
>     - `getAllRules()` returns 37 rules. Nine `location-*` rules have `playstyleId: 'location-control'`; the test fixture uses their real ids and names.
> 11. **Verified** in a scratch sandbox: a copy of `src`, with junctions to the repo's `node_modules` and `upstream` and the caches kept in the sandbox.
>     - **What it holds:** R2-2's files are taken verbatim from its plan. They were checked block for block against `R2-2.md` (`tuningRows.ts`, `rejectedToken.ts`, `tuningFailure.ts`, `useLiveTuning.ts`), and the rest comes from R2-2's own sandbox. R2-1's `CalibrationRow` is a stand-in.
>     - **Expected failures:** each failing-test step's failure was captured against the base files.
>     - **With every step applied:** the whole suite is 86 files and 752 tests, `tsc -p tsconfig.app.json` exits 0, and every new or changed file passes `pnpm exec eslint --stdin` in the repo.
>     - **The Before blocks:** a script applied every Before/After in this file to the repo's current files, and the results equal the verified ones.
> 12. **Added in review, beyond the outline.**
>     - **The tray's edits scroll inside it past 30vh.** The foot is `position: sticky; bottom: 0` and lists every pending edit, and a sticky-bottom box only moves up. Uncapped, about eight Shift-tier score edits on a 768px laptop made it taller than the view: it then covered every editing row at every scroll position, and its own heading and "Clear all" were out of reach (WCAG 2.4.11).
>     - **A failed read offers "Read tuning.json again"**, unless GitHub rejected the token (that offers Forget token). The pending edits live in R2-6's `TunedWorkspace`, so they survive the error, but the aside hides them while it shows it. Before this, the only ways out (leaving the page, Forget token) dropped them. This is an addition to state 3, for the owner to confirm.
>     - **The tray's "Published." line is mounted with the tray**, empty until a publish succeeds, and sits under the Publish button. A live region mounted with its text often goes unannounced, the case R2-2's hand-off warns about for the reload note.
>     - **`src/shell/Sidebar.tsx`'s `TokenBox` comment is updated.** Its claim "It is the only Forget token: the write pages have none of their own" stops being true once R2-6 renders this aside on `/calibration`, which R2-6 makes a write page.
>     - **Stories.** `ForgetTokenOffer` gets one, as every new component does (`Admin/ForgetTokenOffer`, beside `Admin/GithubTokenGate`). The aside's story title is `Admin/Insights/Calibration/Tuning aside`, like its siblings in R2-3, R2-4 and R2-6. The decorator gives the aside a fixed height and its own scroll, so the tray pins to its foot as it does on the page.

### Task R2-5: Tuning aside

**Files:**
- Modify `src/tools/tuning/components/TierRow.tsx`:
  - the fields use tokens and `adm-input`;
  - the aria-labels stay;
  - each error is tied to its field with `aria-describedby` and `aria-invalid`.
- Create `src/tools/tuning/__tests__/TierRow.test.tsx`.
- Create `src/github/ForgetTokenOffer.tsx` and `src/github/ForgetTokenOffer.stories.tsx`.
- Modify `src/shell/Sidebar.tsx`: `TokenBox`'s comment (`:105-110`) no longer says it is the only Forget token (re-base note 12).
- Modify `src/tools/tuning/components/PendingTray.tsx`:
  - the heading reads "Pending changes · N";
  - the edits scroll inside the tray past 30vh, so the pinned foot never outgrows the view;
  - each diff sits in a wrapping `<code>` and is never cut short;
  - the button reads `Publish to {targetBranch()}`;
  - errors show in `Notice tone="error"`, which is the alert, with no wrapper of their own;
  - `onReload` and `onForgetToken`, each offered for its own failure kind;
  - the "Published." status line is mounted with the tray, under the button.
- Modify `src/tools/tuning/components/PendingTray.stories.tsx`: the entry-name labels, an aside-width decorator, and the `LongDiff`, `StaleValue` and `RejectedToken` stories.
- Modify `src/tools/tuning/__tests__/PendingTray.test.tsx` (new cases) and `src/tools/tuning/__tests__/TuningEditor.test.tsx` (the button's new name).
- Create `src/tools/analytics/calibration/reloadNote.ts` and `__tests__/reloadNote.test.ts`.
- Create `src/tools/analytics/calibration/TuningAside.tsx`, `TuningAside.stories.tsx` and `__tests__/TuningAside.test.tsx`.
- Unchanged:
  - `src/github/GithubTokenGate.tsx` (note 2);
  - `TierRow.stories.tsx`: the Storybook preview mounts `AdminStyles`, so `adm-input` styles it as is;
  - `useLiveTuning`, `useTuningAdmin`, `tuningFailure.ts` and `rejectedToken.ts` (R2-2);
  - `TuningEditor.tsx`, which R2-7 deletes.

**Interfaces:**
- **Consumes:**
  - **From R2-1** (`src/tools/analytics/calibration/calibrationModel.ts`): `CalibrationRow` with `id`, `name`, `category`, `stat` and `tuningKey`. The tests build `RuleStat` literals without `playstyleId`, which header addition 8 makes optional.
  - **From R2-2:**
    - from `src/tools/tuning/tuningRows.ts`: `rowsForSelection`, `RowSpec`, `tuningName`, `tuningKind` and `pendingLabel`;
    - from `src/tools/tuning/tuningFailure.ts`: `tuningFailureKind`, with its kinds 'stale-value', 'rejected-token' and 'other';
    - on `UseTuningAdminResult`: `dropStale(config: TuningConfig): number`;
    - `useLiveTuning`, whose `reload` resolves with the config on screen, or null when the read failed or a newer read replaced it;
    - the stale-value message "… Reload tuning.json and make the edit again."
  - **Existing code:**
    - the tuning hook: `useTuningAdmin`, `PendingEdit`, `StageArgs` and `UseTuningAdminResult`;
    - in tests only: `applyTuningEdits`;
    - GitHub: `targetBranch`, `goLiveNote` and `GithubTokenGate`;
    - analytics and UI: `biasCopy`, `gapColor`, `fmtGap`, `fmtInt` and `Notice`;
    - the theme: `ADMIN_COLORS`, `ADMIN_TYPE` and `ADMIN_RADIUS`;
    - through the bridge: `CtaButton`, `LinkButton`, `COLORS`, `SPACING`, `FONTS` and `LETTER_SPACING`.
- **Produces** (header contract addition 10, plus two small modules):
```ts
// src/github/ForgetTokenOffer.tsx (R4 can reuse it)
export function ForgetTokenOffer(props: {onForget: () => void}): JSX.Element; // "GitHub rejected the saved token. [Forget token] to enter a new one."

// src/tools/analytics/calibration/reloadNote.ts
export function reloadNote(dropped: number): string; // the aside's status line after "Reload tuning.json" (R-18)

// src/tools/tuning/components/PendingTray.tsx: the props gain
onReload?: () => void;      // shown for a 'stale-value' error
onForgetToken?: () => void; // shown for a 'rejected-token' error

// src/tools/tuning/components/TierRow.tsx: the same props as today

// src/tools/analytics/calibration/TuningAside.tsx
export interface TuningState {live: ReturnType<typeof useLiveTuning>; admin: UseTuningAdminResult}
export function TuningAside(props: {
  tuning: TuningState | null; onSaveToken: (token: string) => void; onForgetToken: () => void;
  selected: CalibrationRow | null; sharedWith: CalibrationRow[];
}): JSX.Element; // R2-6 renders it inside <aside aria-label="Tuning editor">
```

**States, in order** (`TuningAside`):
1. **No token** (`tuning` is null): the "Tuning editor" eyebrow, then `GithubTokenGate`.
2. **Loading:** "Reading tuning.json from {branch}…".
3. **Read error:** `<Notice tone="error">Could not read tuning.json: {error}</Notice>`. It is the aside's one `role="alert"`; R2-6 queries `within(aside).findByRole('alert')`. Below it:
   - when `tuningFailureKind(live.error) === 'rejected-token'`, `ForgetTokenOffer` (R-26);
   - otherwise a "Read tuning.json again" button, which runs `live.reload()`. The pending edits are held above the aside (R2-6's `TunedWorkspace`), so a read that succeeds brings them back (re-base note 12).
4. **No selection:** "Pick a playstyle or direct synergy to edit its copy and scores."
5. **No entry** (`tuningKey` is null, or `rowsForSelection` returns nothing):
   - the eyebrow "Playstyle" or "Direct synergy", from the row's category;
   - the rule's name as the h2, with its gap and read line;
   - "No copy in tuning.json, so {name} has nothing to tune here." (R-20).
6. **Editing:**
   - the eyebrow "{Playstyle | Direct synergy} · tuning.json" (`tuningKind`);
   - the h2 `tuningName(config, key)`, with the gap and read line (R-21, note 3);
   - "Shared by N rules: …" when `sharedWith` has more than one row;
   - then one `EditableRow` per `rowsForSelection(config, key)` row. `EditableRow` is copied from `TuningEditor.tsx:20-55` (after R2-2) with a `name` prop, and its pending labels are `pendingLabel(name, row.label, field)`.

**From state 4 on,** the body sits over a foot pinned with `position: sticky; bottom: 0`. The foot holds the reload line (`<div role="status" tabIndex={-1}>`) and `PendingTray`.
- **Publish:** `setDropped(null)`, then `admin.publish().then(() => reload(), () => undefined)`, as `TuningEditor.tsx:66` does. The tray shows a failure, and only a success reads `tuning.json` again.
- **Stale value (R-18):** the tray's `onReload` runs `reload()`. When that resolves with a config, it runs `setDropped(admin.dropStale(config))` and moves focus to the line, which reads `reloadNote(dropped)`.
- **Forget token (R-26):** the tray and the read error get the same wrapped `onForgetToken`, which asks first when edits are pending.

Every task ends with the standard commit step, run with the Bash tool and only after the owner approves. Run tests with `pnpm vitest run <path>`. On a fresh checkout, run `pnpm build:engine` first.

- [ ] **Step 1: Write the failing test for `TierRow`.** Create `src/tools/tuning/__tests__/TierRow.test.tsx`:
```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {TierRow} from '../components/TierRow';

function renderRow(props: {score: string; textError?: string; scoreError?: string}) {
  render(
    <TierRow
      label="curve.gap3"
      text="Wide 3-turn gap."
      showText
      showScore
      onTextChange={() => {}}
      onScoreChange={() => {}}
      {...props}
    />,
  );
}

const text = () => screen.getByRole('textbox', {name: 'curve.gap3 text'});
const score = () => screen.getByRole('spinbutton', {name: 'curve.gap3 score'});

describe('TierRow', () => {
  it("ties each field's error to the field, as its description", () => {
    renderRow({score: '11', textError: 'Text must not be empty', scoreError: 'Score must be between 1 and 10'});
    expect(text()).toHaveAccessibleDescription('Text must not be empty');
    expect(text()).toHaveAttribute('aria-invalid', 'true');
    expect(score()).toHaveAccessibleDescription('Score must be between 1 and 10');
    expect(score()).toHaveAttribute('aria-invalid', 'true');
  });

  it('describes a field without an error by nothing, and marks it valid', () => {
    renderRow({score: '6'});
    expect(text()).not.toHaveAttribute('aria-describedby');
    expect(score()).not.toHaveAttribute('aria-describedby');
    expect(score()).toBeValid();
  });
});
```
Run `pnpm vitest run src/tools/tuning/__tests__/TierRow.test.tsx`. Expected: FAIL (`1 failed | 1 passed (2)`). "ties each field's error to the field, as its description" fails at `expect(element).toHaveAccessibleDescription()`.

- [ ] **Step 2: Restyle `TierRow`.** Replace the whole file `src/tools/tuning/components/TierRow.tsx`. The props interface is unchanged.
  - **Fields:** both become `adm-input`, which brings `AdminStyles`' hover and gold focus ring. `textarea.adm-input` already sets a two-line minimum height and vertical resize.
  - **Label:** the row's label is an orphan `<label>` today and becomes a `<p>`. Each field's `aria-label` contains its text (2.5.3).
  - **Errors:** each one is tied to its field.
  - **Spacing:** the bottom margin goes, because the aside's body gap spaces the rows.

Before (the whole file):
```tsx
import {COLORS, SPACING, FONT_SIZES, RADIUS} from '../../../app-bridge';

interface TierRowProps {
  label: string;
  /** What the text field shows: the pending edit, else the saved value. */
  text: string;
  /** What the score field shows: the pending edit, else the saved value. */
  score: number | string;
  showText: boolean;
  showScore: boolean;
  textError?: string;
  scoreError?: string;
  onTextChange: (raw: string) => void;
  onScoreChange: (raw: string) => void;
}

const labelStyle = {
  fontSize: FONT_SIZES.xs,
  color: COLORS.gray600,
  display: 'block',
  marginBottom: 4,
};

const fieldStyle = {
  background: COLORS.surfaceAlt,
  color: COLORS.text,
  border: `1px solid ${COLORS.surfaceHover}`,
  borderRadius: RADIUS.sm,
  fontSize: FONT_SIZES.sm,
};

const errorStyle = {color: COLORS.error, fontSize: FONT_SIZES.xs, marginTop: 4};

/**
 * Presentational, controlled editor row for a single tuning value. The parent
 * passes the value to show (a pending edit, else the saved value), so a row
 * reused for another rule, or a reverted edit, never keeps stale text. Each
 * keystroke fires `onTextChange` / `onScoreChange` with the raw string for the
 * hook to validate and stage.
 */
export function TierRow({
  label,
  text,
  score,
  showText,
  showScore,
  textError,
  scoreError,
  onTextChange,
  onScoreChange,
}: TierRowProps) {
  return (
    <div style={{marginBottom: SPACING.md}}>
      <label style={labelStyle}>{label}</label>
      {showText && (
        <>
          <textarea
            aria-label={`${label} text`}
            style={{...fieldStyle, width: '100%', padding: '8px 10px', minHeight: 60}}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
          />
          {textError && <div style={errorStyle}>{textError}</div>}
        </>
      )}
      {showScore && (
        <>
          <input
            aria-label={`${label} score`}
            type="number"
            min={1}
            max={10}
            step={1}
            style={{...fieldStyle, width: 80, padding: '6px 8px', marginTop: showText ? SPACING.xs : 0}}
            value={score}
            onChange={(e) => onScoreChange(e.target.value)}
          />
          {scoreError && <div style={errorStyle}>{scoreError}</div>}
        </>
      )}
    </div>
  );
}
```
After:
```tsx
import {useId} from 'react';
import {COLORS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';

interface TierRowProps {
  label: string;
  /** What the text field shows: the pending edit, else the saved value. */
  text: string;
  /** What the score field shows: the pending edit, else the saved value. */
  score: number | string;
  showText: boolean;
  showScore: boolean;
  textError?: string;
  scoreError?: string;
  onTextChange: (raw: string) => void;
  onScoreChange: (raw: string) => void;
}

const ROW: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xs};

// The handoff's field label: 12px, muted (R-6: it names data, so never dim).
const LABEL: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

const ERROR: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: COLORS.error};

/**
 * Presentational, controlled editor row for a single tuning value. The parent
 * passes the value to show (a pending edit, else the saved value), so a row
 * reused for another rule, or a reverted edit, never keeps stale text. Each
 * keystroke fires `onTextChange` / `onScoreChange` with the raw string for the
 * hook to validate and stage. The fields are AdminStyles' adm-input, and a
 * field's error is its description (aria-describedby), so it is read with it.
 */
export function TierRow({
  label,
  text,
  score,
  showText,
  showScore,
  textError,
  scoreError,
  onTextChange,
  onScoreChange,
}: TierRowProps) {
  const textErrorId = useId();
  const scoreErrorId = useId();
  return (
    <div style={ROW}>
      {/* Each field's aria-label carries this text, so the visible label is a plain line (2.5.3: the name contains it). */}
      <p style={LABEL}>{label}</p>
      {showText && (
        <>
          <textarea
            className="adm-input"
            aria-label={`${label} text`}
            aria-invalid={textError ? true : undefined}
            aria-describedby={textError ? textErrorId : undefined}
            style={{width: '100%'}}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
          />
          {textError && (
            <p id={textErrorId} style={ERROR}>
              {textError}
            </p>
          )}
        </>
      )}
      {showScore && (
        <>
          <input
            className="adm-input"
            aria-label={`${label} score`}
            aria-invalid={scoreError ? true : undefined}
            aria-describedby={scoreError ? scoreErrorId : undefined}
            type="number"
            min={1}
            max={10}
            step={1}
            style={{width: 80}}
            value={score}
            onChange={(e) => onScoreChange(e.target.value)}
          />
          {scoreError && (
            <p id={scoreErrorId} style={ERROR}>
              {scoreError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
```
Run `pnpm vitest run src/tools/tuning/__tests__/TierRow.test.tsx src/tools/tuning/__tests__/TuningEditor.test.tsx`. Expected: PASS (`Tests  6 passed (6)`). Then `pnpm exec eslint src/tools/tuning/components/TierRow.tsx src/tools/tuning/__tests__/TierRow.test.tsx`, which prints nothing.

- [ ] **Step 3: Write the failing tray tests, and rename the button in `TuningEditor`'s tests.** Make three edits to `src/tools/tuning/__tests__/PendingTray.test.tsx`. `renderTray` now takes any tray props, so the three existing cases stay as they are.

Edit 1. Before (`:1-5`):
```tsx
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PendingTray} from '../components/PendingTray';
import type {PendingEdit} from '../useTuningAdmin';
```
After:
```tsx
import type {ComponentProps} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PendingTray} from '../components/PendingTray';
import {applyTuningEdits} from '../githubClient';
import type {PendingEdit} from '../useTuningAdmin';

// vite.config.ts doesn't set unstubEnvs, so the rehearsal-branch case unstubs by hand.
afterEach(() => vi.unstubAllEnvs());
```
Edit 2. Before (`:16-29`):
```tsx
function renderTray(pending: PendingEdit[], handlers: {onRevert?: () => void; onClear?: () => void} = {}) {
  render(
    <PendingTray
      pending={pending}
      publishDisabled={false}
      publishing={false}
      result={null}
      error={null}
      onRevert={handlers.onRevert ?? (() => {})}
      onClear={handlers.onClear ?? (() => {})}
      onPublish={() => {}}
    />,
  );
}
```
After:
```tsx
function renderTray(pending: PendingEdit[], props: Partial<ComponentProps<typeof PendingTray>> = {}) {
  render(
    <PendingTray
      pending={pending}
      publishDisabled={false}
      publishing={false}
      result={null}
      error={null}
      onRevert={() => {}}
      onClear={() => {}}
      onPublish={() => {}}
      {...props}
    />,
  );
}

/** applyTuningEdits' own refusal: the edit expected 'Ramp', and tuning.json now says 'Ramp 2'. */
function staleRefusal(): string {
  try {
    applyTuningEdits(JSON.stringify({playstyles: {ramp: {name: 'Ramp 2'}}}), [
      {path: ['playstyles', 'ramp', 'name'], value: 'Ramp!', expected: 'Ramp'},
    ]);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('applyTuningEdits accepted a stale value');
}

const REJECTED = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';
```
Edit 3. Before (`:46-50`, the end of the file):
```tsx
  it('hides Clear all with nothing pending', () => {
    renderTray([]);
    expect(screen.queryByRole('button', {name: 'Clear all'})).not.toBeInTheDocument();
  });
});
```
After:
```tsx
  it('hides Clear all with nothing pending', () => {
    renderTray([]);
    expect(screen.queryByRole('button', {name: 'Clear all'})).not.toBeInTheDocument();
  });

  it('counts the pending edits in its heading', () => {
    renderTray([EDIT]);
    expect(screen.getByRole('heading', {level: 2, name: 'Pending changes · 1'})).toBeInTheDocument();
  });

  it('shows a long tagline diff in full, in a <code> that wraps', () => {
    const tagline =
      'Speed up your ink so you can play powerful cards earlier than your opponent, then keep the pressure on every turn after.';
    const path = ['playstyles', 'ramp', 'tagline'];
    renderTray([{...EDIT, path, pathKey: JSON.stringify(path), label: 'Ramp · Tagline · text', oldValue: 'Ink fast', value: tagline}]);
    const diff = screen.getByText(`Ink fast → ${tagline}`);
    expect(diff.tagName).toBe('CODE');
    expect(diff).toHaveStyle({whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'});
  });

  it('scrolls its edits inside the tray, so the pinned foot never outgrows the view', () => {
    renderTray([EDIT]);
    const edits = screen.getByRole('button', {name: 'revert'}).parentElement?.parentElement;
    // jest-dom's toHaveStyle can't parse vh in jsdom, so this reads the declared style.
    expect(edits?.style).toMatchObject({maxHeight: '30vh', overflowY: 'auto'});
  });

  it('names the branch it publishes to', () => {
    renderTray([EDIT]);
    expect(screen.getByRole('button', {name: 'Publish to master'})).toBeEnabled();
  });

  it('names a rehearsal branch on the Publish button', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    renderTray([EDIT]);
    expect(screen.getByRole('button', {name: 'Publish to admin-verify'})).toBeInTheDocument();
  });

  it('offers Reload tuning.json after a stale value', async () => {
    const onReload = vi.fn();
    renderTray([EDIT], {error: staleRefusal(), onReload, onForgetToken: vi.fn()});
    expect(screen.getByRole('alert')).toHaveTextContent('changed since the editor loaded it (now "Ramp 2")');
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'Reload tuning.json'}));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it('offers no reload for a failure a reload would not fix', () => {
    renderTray([EDIT], {error: 'master changed while publishing, so nothing was published. Publish again.', onReload: vi.fn()});
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Reload tuning.json'})).not.toBeInTheDocument();
  });

  it('offers no reload without onReload', () => {
    renderTray([EDIT], {error: staleRefusal()});
    expect(screen.queryByRole('button', {name: 'Reload tuning.json'})).not.toBeInTheDocument();
  });

  it('offers Forget token when GitHub rejected the token', async () => {
    const onForgetToken = vi.fn();
    renderTray([EDIT], {error: REJECTED, onReload: vi.fn(), onForgetToken});
    expect(screen.getByText(/GitHub rejected the saved token/)).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Reload tuning.json'})).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it('offers no Forget token without onForgetToken', () => {
    renderTray([EDIT], {error: REJECTED});
    expect(screen.getByRole('alert')).toHaveTextContent('GitHub 401 on');
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
  });
});
```
In `src/tools/tuning/__tests__/TuningEditor.test.tsx`, both Publish lookups take the button's new name.

Before (`:50-52`):
```tsx

    await userEvent.click(screen.getByRole('button', {name: 'Publish'}));
    await vi.waitFor(() => expect(onPublished).toHaveBeenCalledOnce());
```
After:
```tsx

    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    await vi.waitFor(() => expect(onPublished).toHaveBeenCalledOnce());
```
Before (`:60-62`):
```tsx

    await userEvent.click(screen.getByRole('button', {name: 'Publish'}));
    expect(await screen.findByText('GitHub 422 on /refs: not a fast forward')).toBeInTheDocument();
```
After:
```tsx

    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    expect(await screen.findByText('GitHub 422 on /refs: not a fast forward')).toBeInTheDocument();
```
Run `pnpm vitest run src/tools/tuning/__tests__/PendingTray.test.tsx src/tools/tuning/__tests__/TuningEditor.test.tsx`. Expected: FAIL (`9 failed | 8 passed (17)`).
- **PendingTray (7 fail):**
  - "counts the pending edits in its heading", "names the branch it publishes to", "names a rehearsal branch on the Publish button", "offers Reload tuning.json after a stale value" and "offers Forget token when GitHub rejected the token" can't find their heading or button;
  - "shows a long tagline diff in full, …" fails with `expected 'DIV' to be 'CODE'`;
  - "scrolls its edits inside the tray, …" fails with `expected CSSStyleProperties{ …(6) } to match object { Object (maxHeight, overflowY) }`: today the revert button's grandparent is the tray's `<section>`, which sets neither.
- **TuningEditor (2 fail):** both publish cases fail with `Unable to find an accessible element with the role "button" and name "Publish to master"`.
- **Already passing:** the tray's three existing cases, the two "offers no reload …" guards and "offers no Forget token without onForgetToken".

- [ ] **Step 4: Add `ForgetTokenOffer` and restyle `PendingTray`.** Create `src/github/ForgetTokenOffer.tsx`. It is presentational: the caller decides when to offer it and what forgetting does.
```tsx
import {LinkButton} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';

/**
 * The way out when GitHub rejects the saved token (a 401, isRejectedToken):
 * "Forget token", so the token gate asks for a new one (R-26). The caller
 * decides when to offer it and what forgetting does: the tuning aside asks
 * first when edits are pending. The button sits inside a sentence, so the
 * 24px target rule's inline exception applies (WCAG 2.5.8).
 */
export function ForgetTokenOffer({onForget}: {onForget: () => void}) {
  return (
    <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
      GitHub rejected the saved token.{' '}
      <LinkButton type="button" onClick={onForget} style={{fontSize: ADMIN_TYPE.small}}>
        Forget token
      </LinkButton>{' '}
      to enter a new one.
    </p>
  );
}
```
The sidebar's `TokenBox` comment says it is the only Forget token. Once R2-6 renders the aside on `/calibration`, a write page, that is no longer true. In `src/shell/Sidebar.tsx`, before (`:108-109`):
```tsx
 * token gate. It is the only Forget token: the write pages have none of their
 * own.
```
After:
```tsx
 * token gate. A write page offers its own only when GitHub rejects the token
 * (R-26: the tuning aside's ForgetTokenOffer), and that one asks before it drops
 * pending edits; this one can't see them.
```
Then replace the whole file `src/tools/tuning/components/PendingTray.tsx`.
  - **Diff rows:** the card fill, clipped to the padding box, with the border and the control radius.
  - **Edits:** they scroll inside the tray past 30vh. The tray is pinned to the aside's foot, and a sticky-bottom box only moves up, so an uncapped list would grow past the view and hide every row above it, and its own heading (WCAG 2.4.11).
  - **Heading:** "Pending changes · N" at the body size.
  - **Publish:** full width, with the branch in its name.
  - **Errors:** the error shows in `Notice`'s alert. `PublishError` adds the reload button for 'stale-value' with `onReload`, and `ForgetTokenOffer` for 'rejected-token' with `onForgetToken`.
  - **Published:** the status line is mounted with the tray, and its text arrives with the result, so it is announced. It sits last, under the button, so while it is empty it adds only one gap at the tray's foot.
  - **Edges:** the tray's own top border and margin go, because the aside's foot draws them.

Before (the whole file):
```tsx
import type {PendingEdit} from '../useTuningAdmin';
import {COLORS, SPACING, FONT_SIZES, RADIUS, CtaButton, LinkButton} from '../../../app-bridge';
import {goLiveNote} from '../../../github/goLiveNote';

interface PendingTrayProps {
  pending: PendingEdit[];
  publishDisabled: boolean;
  publishing: boolean;
  result: {commitUrl: string} | null;
  error: string | null;
  onRevert: (pathKey: string) => void;
  onClear: () => void;
  onPublish: () => void;
}

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: SPACING.sm,
  padding: '8px 10px',
  background: COLORS.surfaceAlt,
  border: `1px solid ${COLORS.surfaceHover}`,
  borderRadius: RADIUS.sm,
  marginBottom: SPACING.xs,
  fontSize: FONT_SIZES.sm,
};

function PendingEditRow({edit, onRevert}: {edit: PendingEdit; onRevert: (pathKey: string) => void}) {
  return (
    <div style={rowStyle}>
      <div style={{minWidth: 0}}>
        <div style={{color: COLORS.text}}>{edit.label}</div>
        <div style={{color: edit.valid ? COLORS.gray600 : COLORS.error, fontSize: FONT_SIZES.xs}}>
          {edit.valid ? `${String(edit.oldValue)} → ${String(edit.value)}` : edit.error}
        </div>
      </div>
      <LinkButton type="button" tone="muted" size="sm" onClick={() => onRevert(edit.pathKey)} style={{flexShrink: 0}}>
        revert
      </LinkButton>
    </div>
  );
}

function PublishButton({disabled, publishing, onClick}: {disabled: boolean; publishing: boolean; onClick: () => void}) {
  return (
    <CtaButton onClick={onClick} disabled={disabled} style={{marginTop: SPACING.md}}>
      {publishing ? 'Publishing…' : 'Publish'}
    </CtaButton>
  );
}

/** Bottom tray listing staged edits as diff rows plus publish/clear actions. */
export function PendingTray({
  pending,
  publishDisabled,
  publishing,
  result,
  error,
  onRevert,
  onClear,
  onPublish,
}: PendingTrayProps) {
  return (
    <section
      aria-label="Pending changes"
      style={{
        marginTop: SPACING.lg,
        paddingTop: SPACING.md,
        borderTop: `1px solid ${COLORS.surfaceBorder}`,
      }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm}}>
        <h2 style={{fontSize: FONT_SIZES.xl, margin: 0}}>Pending changes</h2>
        {pending.length > 0 && (
          <LinkButton type="button" tone="muted" size="sm" onClick={onClear}>
            Clear all
          </LinkButton>
        )}
      </div>

      {pending.length === 0 ? (
        <p style={{color: COLORS.gray600, fontSize: FONT_SIZES.sm, margin: 0}}>No pending changes</p>
      ) : (
        pending.map((edit) => <PendingEditRow key={edit.pathKey} edit={edit} onRevert={onRevert} />)
      )}

      {error && (
        <div role="alert" style={{color: COLORS.error, fontSize: FONT_SIZES.sm, marginTop: SPACING.sm}}>
          {error}
        </div>
      )}

      {result && (
        <div role="status" style={{color: COLORS.success, fontSize: FONT_SIZES.sm, marginTop: SPACING.sm}}>
          Published.{' '}
          <a href={result.commitUrl} target="_blank" rel="noreferrer" style={{color: COLORS.primary}}>
            View commit
          </a>
          . {goLiveNote('Changes go live on the next Vercel redeploy.')}
        </div>
      )}

      <PublishButton disabled={publishDisabled} publishing={publishing} onClick={onPublish} />
    </section>
  );
}
```
After:
```tsx
import type {PendingEdit} from '../useTuningAdmin';
import {COLORS, SPACING, CtaButton, LinkButton} from '../../../app-bridge';
import {ForgetTokenOffer} from '../../../github/ForgetTokenOffer';
import {targetBranch} from '../../../github/githubCommit';
import {goLiveNote} from '../../../github/goLiveNote';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
import {tuningFailureKind} from '../tuningFailure';

interface PendingTrayProps {
  pending: PendingEdit[];
  publishDisabled: boolean;
  publishing: boolean;
  result: {commitUrl: string} | null;
  error: string | null;
  onRevert: (pathKey: string) => void;
  onClear: () => void;
  onPublish: () => void;
  /** Reads tuning.json again. Offered for a stale-value refusal only, and only when given. */
  onReload?: () => void;
  /** Forgets the saved token. Offered when GitHub rejected it (a 401) only, and only when given. */
  onForgetToken?: () => void;
}

const ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: SPACING.md,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  // A translucent fill under a border: clip it to the padding box (adminTheme.ts).
  backgroundColor: ADMIN_COLORS.card,
  backgroundClip: 'padding-box',
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: ADMIN_RADIUS.control,
  fontSize: ADMIN_TYPE.small,
};

// The edits scroll inside the tray past a third of the view, so the aside's pinned foot never
// outgrows the view and hides the rows above it, or its own heading.
const EDITS: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.sm,
  maxHeight: '30vh',
  overflowY: 'auto',
};

// The whole diff, wrapped: a long tagline is the edit under review, so it is never cut short.
const DIFF: React.CSSProperties = {
  display: 'block',
  fontSize: ADMIN_TYPE.label,
  color: ADMIN_COLORS.muted,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

function PendingEditRow({edit, onRevert}: {edit: PendingEdit; onRevert: (pathKey: string) => void}) {
  return (
    <div style={ROW}>
      <div style={{minWidth: 0}}>
        <div style={{color: ADMIN_COLORS.text}}>{edit.label}</div>
        {edit.valid ? (
          // <code> gives the diff the UA monospace with no font declaration (R-7).
          <code style={DIFF}>{`${String(edit.oldValue)} → ${String(edit.value)}`}</code>
        ) : (
          <div style={{fontSize: ADMIN_TYPE.label, color: COLORS.error}}>{edit.error}</div>
        )}
      </div>
      <LinkButton
        type="button"
        tone="muted"
        onClick={() => onRevert(edit.pathKey)}
        style={{flexShrink: 0, fontSize: ADMIN_TYPE.small}}>
        revert
      </LinkButton>
    </div>
  );
}

/**
 * A failed publish, and the way out its kind needs (tuningFailureKind): a
 * reload after a stale value (R-18), a new token after GitHub rejects this
 * one (R-26). Notice's error tone is the alert (R1-3), so nothing here wraps
 * it in another.
 */
function PublishError({
  error,
  onReload,
  onForgetToken,
}: {
  error: string;
  onReload?: () => void;
  onForgetToken?: () => void;
}) {
  const kind = tuningFailureKind(error);
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.sm}}>
      <Notice tone="error">{error}</Notice>
      {onReload && kind === 'stale-value' && (
        <CtaButton type="button" variant="neutral" onClick={onReload} style={{alignSelf: 'flex-start'}}>
          Reload tuning.json
        </CtaButton>
      )}
      {onForgetToken && kind === 'rejected-token' && <ForgetTokenOffer onForget={onForgetToken} />}
    </div>
  );
}

/** The staged edits as diff rows, then a failed publish's error, the Publish button and the last publish's commit. */
export function PendingTray({
  pending,
  publishDisabled,
  publishing,
  result,
  error,
  onRevert,
  onClear,
  onPublish,
  onReload,
  onForgetToken,
}: PendingTrayProps) {
  return (
    <section aria-label="Pending changes" style={{display: 'flex', flexDirection: 'column', gap: SPACING.sm}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.md}}>
        <h2 style={{margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 700, color: ADMIN_COLORS.text}}>
          Pending changes · {pending.length}
        </h2>
        {pending.length > 0 && (
          <LinkButton type="button" tone="muted" onClick={onClear} style={{fontSize: ADMIN_TYPE.small}}>
            Clear all
          </LinkButton>
        )}
      </div>

      {pending.length === 0 ? (
        <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>No pending changes</p>
      ) : (
        <div style={EDITS}>
          {pending.map((edit) => (
            <PendingEditRow key={edit.pathKey} edit={edit} onRevert={onRevert} />
          ))}
        </div>
      )}

      {error && <PublishError error={error} onReload={onReload} onForgetToken={onForgetToken} />}

      <CtaButton type="button" onClick={onPublish} disabled={publishDisabled} style={{width: '100%'}}>
        {publishing ? 'Publishing…' : `Publish to ${targetBranch()}`}
      </CtaButton>

      {/* Mounted with the tray, so "Published." is announced when it arrives:
          a live region mounted with its text often isn't. */}
      <p role="status" style={{margin: 0, fontSize: ADMIN_TYPE.small, color: COLORS.success}}>
        {result && (
          <>
            Published.{' '}
            <a href={result.commitUrl} target="_blank" rel="noreferrer" style={{color: ADMIN_COLORS.accent}}>
              View commit
            </a>
            . {goLiveNote('Changes go live on the next Vercel redeploy.')}
          </>
        )}
      </p>
    </section>
  );
}
```
Run `pnpm vitest run src/tools/tuning`. Expected: PASS (every file in the folder). Then `pnpm exec eslint src/tools/tuning src/github/ForgetTokenOffer.tsx src/shell/Sidebar.tsx`, which prints nothing.

- [ ] **Step 5: Update the tray's stories, and add `ForgetTokenOffer`'s.** Create `src/github/ForgetTokenOffer.stories.tsx`, beside `GithubTokenGate.stories.tsx` (`Admin/GithubTokenGate`):
```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {ForgetTokenOffer} from './ForgetTokenOffer';

const meta: Meta<typeof ForgetTokenOffer> = {
  title: 'Admin/ForgetTokenOffer',
  component: ForgetTokenOffer,
  args: {onForget: () => {}},
};
export default meta;
type Story = StoryObj<typeof ForgetTokenOffer>;

export const Default: Story = {};
```
Then make six edits to `src/tools/tuning/components/PendingTray.stories.tsx`. The new stories are `LongDiff`, `StaleValue` (with `onReload`) and `RejectedToken` (with `onForgetToken`), and an aside-width decorator is added.

Edit 1. Before (`:1-3`):
```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import type {PendingEdit} from '../useTuningAdmin';
import {PendingTray} from './PendingTray';
```
After:
```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import type {PendingEdit} from '../useTuningAdmin';
import {PendingTray} from './PendingTray';
```
Edit 2. Before (`:12`): `    label: 'curve.gap3 · score',`. After: `    label: 'Shift Targets · curve.gap3 · score',`

Edit 3. Before (`:22`): `    label: 'Title · text',`. After: `    label: 'Ramp · Title · text',`

Edit 4. Before (`:39-42`):
```tsx
    onPublish: () => {},
  },
};
export default meta;
```
After:
```tsx
    onPublish: () => {},
  },
  decorators: [
    (Story) => (
      // The tuning aside's foot, where the tray is pinned (R2-5).
      <div style={{width: 380, padding: SPACING.xxl, background: ADMIN_COLORS.aside}}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
```
Edit 5. Before (`:58`): `export const Publishing: Story = {`. After:
```tsx
export const LongDiff: Story = {
  args: {
    pending: [
      edit({
        path: ['playstyles', 'ramp', 'tagline'],
        label: 'Ramp · Tagline · text',
        oldValue: 'Speed up your ink so you can play powerful cards earlier than your opponent.',
        value: 'Speed up your ink so you can play powerful cards earlier than your opponent, then keep the pressure on.',
      }),
    ],
  },
};

export const Publishing: Story = {
```
Edit 6. Before (`:66-68`, the end of the file):
```tsx
export const WithError: Story = {
  args: {error: 'Publish failed: 403 Forbidden'},
};
```
After:
```tsx
export const WithError: Story = {
  args: {error: 'Publish failed: 403 Forbidden'},
};

export const StaleValue: Story = {
  args: {
    error:
      'playstyles.ramp.name changed since the editor loaded it (now "Ramp 2"). Reload tuning.json and make the edit again.',
    onReload: () => {},
  },
};

export const RejectedToken: Story = {
  args: {
    error: 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}',
    onForgetToken: () => {},
  },
};
```
Run `pnpm exec eslint src/github/ForgetTokenOffer.stories.tsx src/tools/tuning/components/PendingTray.stories.tsx`, which prints nothing.

- [ ] **Step 6: Write the failing test for the reload note.** The three sentences are R2-2's hand-off. Create `src/tools/analytics/calibration/__tests__/reloadNote.test.ts`:
```ts
import {describe, expect, it} from 'vitest';
import {reloadNote} from '../reloadNote';

describe('reloadNote', () => {
  it('says every pending edit still applies when none was dropped', () => {
    expect(reloadNote(0)).toBe('Reloaded tuning.json. Every pending edit still applies.');
  });

  it('asks for one dropped edit to be made again', () => {
    expect(reloadNote(1)).toBe('Reloaded tuning.json. Dropped 1 edit whose value had changed: make it again.');
  });

  it('counts several dropped edits', () => {
    expect(reloadNote(3)).toBe('Reloaded tuning.json. Dropped 3 edits whose values had changed: make them again.');
  });
});
```
Run `pnpm vitest run src/tools/analytics/calibration/__tests__/reloadNote.test.ts`. Expected: FAIL, with `Error: Failed to resolve import "../reloadNote" from "src/tools/analytics/calibration/__tests__/reloadNote.test.ts". Does the file exist?`

- [ ] **Step 7: Implement `reloadNote`.** Create `src/tools/analytics/calibration/reloadNote.ts`. It is a `.ts` module beside the aside because a component file may export only components.
```ts
import {fmtInt} from '../../../ui/format';

/**
 * What "Reload tuning.json" did to the pending edits (R-18): the tuning
 * aside's status line once dropStale has run. A dropped edit was staged
 * against a value tuning.json no longer holds, so it has to be made again.
 */
export function reloadNote(dropped: number): string {
  if (dropped === 0) return 'Reloaded tuning.json. Every pending edit still applies.';
  if (dropped === 1) return 'Reloaded tuning.json. Dropped 1 edit whose value had changed: make it again.';
  return `Reloaded tuning.json. Dropped ${fmtInt(dropped)} edits whose values had changed: make them again.`;
}
```
Run `pnpm vitest run src/tools/analytics/calibration/__tests__/reloadNote.test.ts`. Expected: PASS (`Tests  3 passed (3)`).

- [ ] **Step 8: Write the failing tests for the aside.**
  - **Harness:** the real `useTuningAdmin('tok')`, with `commitTuning` mocked and the rest of `githubClient` kept real, so `applyTuningEdits` gives its own refusal. The live read is a fake, ready with `CONFIG`; a reload reads `reloadTo()` and shows it, as `useLiveTuning` does.
  - **Forget token:** `onForgetToken` is a spy, and `window.confirm` is stubbed per case (jsdom doesn't implement it).
  - **Cleanup:** `afterEach` unstubs envs, because `vite.config.ts` doesn't set `unstubEnvs` (`router.test.tsx` unstubs by hand), and restores the spies.
  - **The cases:**
    - The ported `TuningEditor` cases are "shows each rule its own values …", "shows the saved value again …", and the publish success and failure cases.
    - Header addition 10's three Forget cases are: no edits pending, no confirm; one edit pending, confirm false; then confirm true.
    - R2-2's reload case drops the stale edit, keeps the other, says "Dropped 1 edit…", calls `live.reload` once, and clears the note on the next publish.
    - Re-base note 12's case: a failed read (not a 401) offers "Read tuning.json again", which calls `live.reload` once; the 401 read case checks that it is not offered.

Create `src/tools/analytics/calibration/__tests__/TuningAside.test.tsx`:
```tsx
import {useState} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {applyTuningEdits} from '../../../tuning/githubClient';
import {useTuningAdmin} from '../../../tuning/useTuningAdmin';
import type {RuleStat} from '../../voteAnalyticsTypes';
import type {CalibrationRow} from '../calibrationModel';
import {TuningAside, type TuningState} from '../TuningAside';

// Publishes go through commitTuning; each test decides how it settles. The
// rest of githubClient stays real, so applyTuningEdits gives its own refusal.
const commitTuning = vi.hoisted(() => vi.fn());
vi.mock('../../../tuning/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../tuning/githubClient')>()),
  commitTuning,
}));

type Live = TuningState['live'];

const CONFIG: TuningConfig = {
  playstyles: {
    ramp: {name: 'Ramp', tagline: 'Ink fast'},
    dwarfs: {name: 'Dwarfs', tagline: 'Go wide'},
    'location-control': {name: 'Locations', tagline: 'Build around locations'},
  },
  directRules: {'shift-targets': {name: 'Shift Targets', description: 'Shift onto a target'}},
  ruleTexts: {'shift-targets': {'curve.gap3': {score: 5, text: 'Wide gap'}}, ramp: {scores: {density: 5}, templates: {}}},
};

function row(
  id: string,
  name: string,
  tuningKey: string | null,
  meanGap: number | null,
  category: CalibrationRow['category'] = 'playstyle',
): CalibrationRow {
  const stat: RuleStat = {
    ruleId: id,
    ruleName: name,
    category,
    scoreVotes: 557,
    pairsVoted: 40,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 120,
  };
  return {id, name, category, stat, tuningKey};
}

const RAMP = row('ramp', 'Ramp', 'ramp', -0.57);
const DWARFS = row('dwarfs', 'Dwarfs', 'dwarfs', 0.1);
const SINGER = row('singer-songs', 'Singer + Songs', null, 0.4, 'direct');
// The nine location-* rules, which all keep their copy under location-control (pin bc877e1).
const LOCATIONS = [
  ['location-at-payoff', 'At Location Payoff'],
  ['location-play-trigger', 'Location Play Trigger'],
  ['location-move-trigger', 'Location Move Trigger'],
  ['location-buff', 'Location Buff'],
  ['location-location-ramp', 'Location Ramp'],
  ['location-move', 'Move to Location'],
  ['location-in-play-check', 'Location In-Play Check'],
  ['location-search', 'Location Search'],
  ['location-boost', 'Location Boost'],
].map(([id, name], i) => row(id, name, 'location-control', -(i + 1) / 10));
const BOOST = LOCATIONS[8]; // gap −0.90

const REJECTED_READ = 'GitHub 401 on packages/synergy-engine/src/data/tuning.json: {"message":"Bad credentials"}';
const REJECTED_PUBLISH = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';

/**
 * The real edit hook and a live read that is ready with CONFIG, as R2-6's
 * TunedWorkspace hands them down. `live` replaces the read; a reload reads
 * `reloadTo()` and shows it, as useLiveTuning does.
 */
function Harness({
  selected = null,
  sharedWith = [],
  live,
  reloadTo = () => CONFIG,
  onForgetToken = () => {},
}: {
  selected?: CalibrationRow | null;
  sharedWith?: CalibrationRow[];
  live?: Live;
  reloadTo?: () => TuningConfig;
  onForgetToken?: () => void;
}) {
  const [config, setConfig] = useState(CONFIG);
  const admin = useTuningAdmin('tok');
  const ready: Live = {
    status: 'ready',
    config,
    reload: async () => {
      const next = reloadTo();
      setConfig(next);
      return next;
    },
  };
  return (
    <TuningAside
      tuning={{live: live ?? ready, admin}}
      onSaveToken={() => {}}
      onForgetToken={onForgetToken}
      selected={selected}
      sharedWith={sharedWith}
    />
  );
}

/** applyTuningEdits' own refusal of the tagline edit, once the branch holds `onBranch`. */
function staleRefusal(onBranch: TuningConfig): Error {
  try {
    applyTuningEdits(JSON.stringify(onBranch), [
      {path: ['playstyles', 'ramp', 'tagline'], value: 'Ink fast!', expected: 'Ink fast'},
    ]);
  } catch (e) {
    return e as Error;
  }
  throw new Error('applyTuningEdits accepted a stale value');
}

const title = () => screen.getByRole('textbox', {name: 'Title text'});
const tray = () => within(screen.getByRole('region', {name: 'Pending changes'}));

async function renameRamp(to: string) {
  await userEvent.clear(title());
  await userEvent.type(title(), to);
}

// vite.config.ts doesn't set unstubEnvs; restoreAllMocks undoes the window.confirm spies.
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  commitTuning.mockReset();
});

describe('TuningAside, by state', () => {
  it('asks for a GitHub token without one, for the tuning editor', () => {
    render(
      <TuningAside tuning={null} onSaveToken={() => {}} onForgetToken={() => {}} selected={RAMP} sharedWith={[RAMP]} />,
    );
    expect(screen.getByText('Tuning editor')).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'GitHub token'})).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub token')).toBeInTheDocument();
  });

  it('says it is reading tuning.json from the target branch', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    render(<Harness live={{status: 'loading', reload: vi.fn()}} />);
    expect(screen.getByText('Reading tuning.json from admin-verify…')).toBeInTheDocument();
  });

  it('says why tuning.json could not be read, in its one alert', () => {
    const error = 'GitHub 404 on packages/synergy-engine/src/data/tuning.json: Not Found';
    render(<Harness live={{status: 'error', error, reload: vi.fn()}} />);
    expect(screen.getByRole('alert')).toHaveTextContent(`Could not read tuning.json: ${error}`);
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
  });

  it('reads tuning.json again from a failed read', async () => {
    const reload = vi.fn(() => Promise.resolve(null));
    const error = 'GitHub 502 on packages/synergy-engine/src/data/tuning.json: Bad gateway';
    render(<Harness live={{status: 'error', error, reload}} />);
    await userEvent.click(screen.getByRole('button', {name: 'Read tuning.json again'}));
    expect(reload).toHaveBeenCalledOnce();
  });

  it('offers Forget token when GitHub rejects the token on the read, without asking when nothing is pending', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const onForgetToken = vi.fn();
    render(<Harness live={{status: 'error', error: REJECTED_READ, reload: vi.fn()}} onForgetToken={onForgetToken} />);
    expect(screen.getByRole('alert')).toHaveTextContent(`Could not read tuning.json: ${REJECTED_READ}`);
    // Reading again with the same token would fail the same way.
    expect(screen.queryByRole('button', {name: 'Read tuning.json again'})).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('prompts for a rule with none selected, over the pinned tray', () => {
    render(<Harness />);
    expect(screen.getByText('Pick a playstyle or direct synergy to edit its copy and scores.')).toBeInTheDocument();
    expect(tray().getByRole('heading', {level: 2, name: 'Pending changes · 0'})).toBeInTheDocument();
    expect(screen.getByRole('region', {name: 'Pending changes'}).parentElement).toHaveStyle({position: 'sticky', bottom: '0px'});
    expect(screen.getByRole('button', {name: 'Publish to master'})).toBeDisabled();
  });

  it('says a rule with no entry has no copy in tuning.json', () => {
    render(<Harness selected={SINGER} sharedWith={[]} />);
    expect(screen.getByText('Direct synergy')).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'Singer + Songs'})).toBeInTheDocument();
    expect(screen.getByText(/^No copy in tuning\.json/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

describe('TuningAside, editing', () => {
  it("heads a shared entry with its name and its rules, and the gap with the selected rule's name", () => {
    render(<Harness selected={BOOST} sharedWith={LOCATIONS} />);
    expect(screen.getByText('Playstyle · tuning.json')).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'Locations'})).toBeInTheDocument();
    expect(
      screen.getByText(
        'Shared by 9 rules: At Location Payoff, Location Play Trigger, Location Move Trigger, Location Buff, ' +
          'Location Ramp, Move to Location, Location In-Play Check, Location Search, Location Boost',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Location Boost gap').parentElement).toHaveTextContent('Location Boost gap −0.90');
    expect(
      screen.getByText('Location Boost: The engine rates pairs about 0.90 points higher than the community on average.'),
    ).toBeInTheDocument();
    expect(title()).toHaveValue('Locations');
  });

  it('heads an entry of its own with the plain gap and read line, over its real rows', () => {
    render(<Harness selected={RAMP} sharedWith={[RAMP]} />);
    expect(screen.getByRole('heading', {level: 2, name: 'Ramp'})).toBeInTheDocument();
    expect(screen.getByText('Gap').parentElement).toHaveTextContent('Gap −0.57');
    expect(
      screen.getByText('The engine rates pairs about 0.57 points higher than the community on average.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Shared by/)).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', {name: 'score · density score'})).toHaveValue(5);
  });

  it('shows each rule its own values, and keeps a pending edit with its rule', async () => {
    const {rerender} = render(<Harness selected={RAMP} />);
    await renameRamp('Ramp!');

    rerender(<Harness selected={DWARFS} />);
    expect(title()).toHaveValue('Dwarfs');

    rerender(<Harness selected={RAMP} />);
    expect(title()).toHaveValue('Ramp!');
  });

  it('shows the saved value again once an edit is reverted', async () => {
    render(<Harness selected={RAMP} />);
    await renameRamp('Ramp!');

    await userEvent.click(tray().getByRole('button', {name: 'revert'}));
    expect(title()).toHaveValue('Ramp');
  });

  it("labels a pending edit with the entry's name", async () => {
    render(<Harness selected={BOOST} sharedWith={LOCATIONS} />);
    await userEvent.type(title(), '!');
    expect(tray().getByText('Locations · Title · text')).toBeInTheDocument();
  });
});

describe('TuningAside, publishing', () => {
  it('links the commit after a publish, says when it goes live, and reads tuning.json again', async () => {
    commitTuning.mockResolvedValue({commitUrl: 'https://github.com/Doberjohn/inkweave/commit/abc123'});
    const reloadTo = vi.fn(() => CONFIG);
    render(<Harness selected={RAMP} reloadTo={reloadTo} />);
    await renameRamp('Ramp!');

    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    expect(await screen.findByRole('link', {name: 'View commit'})).toHaveAttribute(
      'href',
      'https://github.com/Doberjohn/inkweave/commit/abc123',
    );
    expect(screen.getByText(/Changes go live on the next Vercel redeploy\./)).toBeInTheDocument();
    await vi.waitFor(() => expect(reloadTo).toHaveBeenCalledOnce());
  });

  it('keeps the values it has when a publish fails, and says why in an alert', async () => {
    commitTuning.mockRejectedValue(new Error('GitHub 422 on /refs: not a fast forward'));
    const reloadTo = vi.fn(() => CONFIG);
    render(<Harness selected={RAMP} reloadTo={reloadTo} />);
    await renameRamp('Ramp!');

    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('GitHub 422 on /refs: not a fast forward');
    expect(title()).toHaveValue('Ramp!');
    expect(reloadTo).not.toHaveBeenCalled();
  });

  it('shows Publishing… on a disabled button while the commit runs', async () => {
    commitTuning.mockReturnValue(new Promise(() => {}));
    render(<Harness selected={RAMP} />);
    await renameRamp('Ramp!');

    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    expect(screen.getByRole('button', {name: 'Publishing…'})).toBeDisabled();
  });

  it('offers Reload tuning.json, which drops the stale edit, keeps the other and says so, until the next publish', async () => {
    // Someone changed Ramp's tagline on the branch after this editor read it.
    const onBranch: TuningConfig = {...CONFIG, playstyles: {...CONFIG.playstyles, ramp: {name: 'Ramp', tagline: 'Ink faster'}}};
    commitTuning.mockRejectedValue(staleRefusal(onBranch));
    const reloadTo = vi.fn(() => onBranch);
    render(<Harness selected={RAMP} reloadTo={reloadTo} />);
    await renameRamp('Ramp!');
    await userEvent.type(screen.getByRole('textbox', {name: 'Tagline text'}), '!');

    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'playstyles.ramp.tagline changed since the editor loaded it (now "Ink faster")',
    );

    await userEvent.click(screen.getByRole('button', {name: 'Reload tuning.json'}));
    const note = await screen.findByText('Reloaded tuning.json. Dropped 1 edit whose value had changed: make it again.');
    expect(note).toHaveAttribute('role', 'status');
    expect(note).toHaveFocus();
    expect(reloadTo).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(tray().getAllByRole('button', {name: 'revert'})).toHaveLength(1);
    expect(tray().getByText('Ramp · Title · text')).toBeInTheDocument();
    expect(title()).toHaveValue('Ramp!');
    expect(screen.getByRole('textbox', {name: 'Tagline text'})).toHaveValue('Ink faster');

    commitTuning.mockReturnValue(new Promise(() => {}));
    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    expect(note).toBeEmptyDOMElement();
  });

  it('names a rehearsal branch on the Publish button', async () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    render(<Harness selected={RAMP} />);
    await renameRamp('Ramp!');
    expect(screen.getByRole('button', {name: 'Publish to admin-verify'})).toBeEnabled();
  });

  it('asks before Forget token drops a pending edit, after GitHub rejects the token on publish', async () => {
    commitTuning.mockRejectedValue(new Error(REJECTED_PUBLISH));
    const onForgetToken = vi.fn();
    render(<Harness selected={RAMP} onForgetToken={onForgetToken} />);
    await renameRamp('Ramp!');
    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    const forget = await screen.findByRole('button', {name: 'Forget token'});

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await userEvent.click(forget);
    expect(confirm).toHaveBeenCalledWith('Forget the token and drop 1 unpublished edit?');
    expect(onForgetToken).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await userEvent.click(forget);
    expect(onForgetToken).toHaveBeenCalledOnce();
  });
});
```
Run `pnpm vitest run src/tools/analytics/calibration/__tests__/TuningAside.test.tsx`. Expected: FAIL, with `Error: Failed to resolve import "../TuningAside" from "src/tools/analytics/calibration/__tests__/TuningAside.test.tsx". Does the file exist?`

- [ ] **Step 9: Implement the aside.** Create `src/tools/analytics/calibration/TuningAside.tsx`.
  - **The pinned foot:** its fill layers the aside's tint over the page, because rows scroll under it. `adminTheme.ts` asks this of anything that must hide what is under it.
  - **No effects:** the reload and its `dropStale` run in the click's promise chain.
```tsx
import {useRef, useState} from 'react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {CtaButton, FONTS, LETTER_SPACING, SPACING} from '../../../app-bridge';
import {ForgetTokenOffer} from '../../../github/ForgetTokenOffer';
import {GithubTokenGate} from '../../../github/GithubTokenGate';
import {targetBranch} from '../../../github/githubCommit';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {Notice} from '../../../ui/Notice';
import {PendingTray} from '../../tuning/components/PendingTray';
import {TierRow} from '../../tuning/components/TierRow';
import {tuningFailureKind} from '../../tuning/tuningFailure';
import {pendingLabel, rowsForSelection, tuningKind, tuningName, type RowSpec} from '../../tuning/tuningRows';
import type {useLiveTuning} from '../../tuning/useLiveTuning';
import type {PendingEdit, StageArgs, UseTuningAdminResult} from '../../tuning/useTuningAdmin';
import {biasCopy} from '../biasCopy';
import {gapColor} from '../gapColor';
import type {CalibrationRow} from './calibrationModel';
import {reloadNote} from './reloadNote';

/** Both tuning hooks. They need a token, so R2-6's TunedWorkspace calls them and hands them down. */
export interface TuningState {
  live: ReturnType<typeof useLiveTuning>;
  admin: UseTuningAdminResult;
}

interface TuningAsideProps {
  /** null without a token: the aside asks for one. */
  tuning: TuningState | null;
  onSaveToken: (token: string) => void;
  /** Forgets the saved token (the shared store's clearToken). The aside asks first when edits are pending. */
  onForgetToken: () => void;
  /** The rules table's selection, resolved from ?rule= (findRow), or null on "All pairs". */
  selected: CalibrationRow | null;
  /** The rows whose tuningKey is the selected row's (rowsSharingKey): two or more is a shared entry (R-21). */
  sharedWith: CalibrationRow[];
}

type Path = (string | number)[];

const PADDED: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.md, padding: SPACING.xxl};

// R2-6's <aside> stretches to the row, and this column fills it, so the tray sits at
// the foot of a short aside and sticks to the bottom of the view on a long page.
const COLUMN: React.CSSProperties = {display: 'flex', flexDirection: 'column', minHeight: '100%'};
const BODY: React.CSSProperties = {flex: 1, display: 'flex', flexDirection: 'column', gap: SPACING.xl, padding: SPACING.xxl};
const FOOT: React.CSSProperties = {
  position: 'sticky',
  bottom: 0,
  padding: `${SPACING.lg}px ${SPACING.xxl}px`,
  borderTop: `1px solid ${ADMIN_COLORS.border}`,
  // The rows scroll under the pinned tray, so its fill hides them: the aside's tint over the page (adminTheme.ts).
  background: `linear-gradient(${ADMIN_COLORS.aside}, ${ADMIN_COLORS.aside}), ${ADMIN_COLORS.page}`,
};

const TEXT: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, lineHeight: 1.5, color: ADMIN_COLORS.muted};
const EYEBROW: React.CSSProperties = {
  margin: 0,
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.eyebrow,
  textTransform: 'uppercase',
  // Muted, not dim: it says what the aside holds (R-6).
  color: ADMIN_COLORS.muted,
};
const TITLE_ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: SPACING.md,
};
// The handoff's 28px Tinos pair, the entry's name and the gap (R-14: Tinos on headline numbers).
const TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.pageTitle,
  fontWeight: 400,
  lineHeight: 1.1,
  color: ADMIN_COLORS.text,
};
const GAP: React.CSSProperties = {margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end'};
const GAP_LABEL: React.CSSProperties = {fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const GAP_VALUE: React.CSSProperties = {fontFamily: FONTS.hero, fontSize: ADMIN_TYPE.kpi, lineHeight: 1.1};

const kindLabel = (kind: 'playstyle' | 'direct') => (kind === 'playstyle' ? 'Playstyle' : 'Direct synergy');

/**
 * R-26's "Forget token", which asks first when edits are pending: R2-6 keys
 * the workspace by the token, so forgetting it drops them, and a new token
 * could have published them (a publish checks each edit's old value, never
 * the token).
 */
function confirmForget(pending: number, onForgetToken: () => void): () => void {
  return () => {
    if (pending === 0 || window.confirm(`Forget the token and drop ${pending} unpublished edit${pending === 1 ? '' : 's'}?`)) {
      onForgetToken();
    }
  };
}

/**
 * The entry's name over the selected rule's gap and read line. A shared entry
 * (Locations: nine location-* rules) names the rules that share it, and a
 * rule whose entry goes by another name (Location Boost under Locations, Lore
 * Loss under Lore Denial) labels its gap and read line with its own name, so
 * the number never reads as the entry's (R-21).
 */
function EntryHeader({
  eyebrow,
  title,
  row,
  sharedWith,
}: {
  eyebrow: string;
  title: string;
  row: CalibrationRow;
  sharedWith: CalibrationRow[];
}) {
  const gap = row.stat?.meanGap ?? null;
  const own = row.name === title;
  const {read} = biasCopy(gap);
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.sm}}>
      <p style={EYEBROW}>{eyebrow}</p>
      <div style={TITLE_ROW}>
        <h2 style={TITLE}>{title}</h2>
        <p style={GAP}>
          <span style={GAP_LABEL}>{own ? 'Gap' : `${row.name} gap`}</span>{' '}
          <span style={{...GAP_VALUE, color: gapColor(gap)}}>{fmtGap(gap)}</span>
        </p>
      </div>
      {sharedWith.length > 1 && (
        <p style={{...TEXT, fontSize: ADMIN_TYPE.small}}>
          Shared by {sharedWith.length} rules: {sharedWith.map((shared) => shared.name).join(', ')}
        </p>
      )}
      <p style={TEXT}>{own ? read : `${row.name}: ${read}`}</p>
    </div>
  );
}

/**
 * One editable row, copied from TuningEditor (which R2-7 deletes). It shows
 * the pending value when there is one and the saved value otherwise, so
 * switching rules, reverting and clearing always show what Publish would
 * commit. Its pending edits are labelled with the entry's name.
 */
function EditableRow({
  row,
  name,
  pendingFor,
  stageEdit,
}: {
  row: RowSpec;
  name: string;
  pendingFor: (path: Path | undefined) => PendingEdit | undefined;
  stageEdit: (args: StageArgs) => void;
}) {
  const text = pendingFor(row.textPath);
  const score = pendingFor(row.scorePath);
  return (
    <TierRow
      label={row.label}
      text={String(text?.value ?? row.textValue ?? '')}
      score={score?.value ?? row.scoreValue ?? ''}
      showText={row.textPath !== undefined}
      showScore={row.scorePath !== undefined}
      textError={text?.error}
      scoreError={score?.error}
      onTextChange={(raw) =>
        row.textPath &&
        stageEdit({
          path: row.textPath,
          rawValue: raw,
          kind: 'text',
          oldValue: row.textValue ?? '',
          label: pendingLabel(name, row.label, 'text'),
        })
      }
      onScoreChange={(raw) =>
        row.scorePath &&
        stageEdit({
          path: row.scorePath,
          rawValue: raw,
          kind: 'score',
          oldValue: row.scoreValue ?? 0,
          label: pendingLabel(name, row.label, 'score'),
        })
      }
    />
  );
}

/** The aside's body: a prompt, the "no copy" state (R-20), or the selected entry's rows. */
function SelectedEntry({
  config,
  pending,
  selected,
  sharedWith,
  stageEdit,
}: {
  config: TuningConfig;
  pending: PendingEdit[];
  selected: CalibrationRow | null;
  sharedWith: CalibrationRow[];
  stageEdit: (args: StageArgs) => void;
}) {
  if (!selected) return <p style={TEXT}>Pick a playstyle or direct synergy to edit its copy and scores.</p>;
  const key = selected.tuningKey;
  const rows = key ? rowsForSelection(config, key) : [];
  if (!key || rows.length === 0) {
    return (
      <>
        <EntryHeader eyebrow={kindLabel(selected.category)} title={selected.name} row={selected} sharedWith={[]} />
        <p style={TEXT}>No copy in tuning.json, so {selected.name} has nothing to tune here.</p>
      </>
    );
  }
  const name = tuningName(config, key);
  const pendingFor = (path: Path | undefined) =>
    path ? pending.find((edit) => edit.pathKey === JSON.stringify(path)) : undefined;
  return (
    <>
      <EntryHeader
        eyebrow={`${kindLabel(tuningKind(config, key))} · tuning.json`}
        title={name}
        row={selected}
        sharedWith={sharedWith}
      />
      {rows.map((row) => (
        <EditableRow key={row.label} row={row} name={name} pendingFor={pendingFor} stageEdit={stageEdit} />
      ))}
    </>
  );
}

/** tuning.json is loaded: the selected entry over the pinned tray. */
function ReadyAside({
  config,
  reload,
  admin,
  selected,
  sharedWith,
  onForgetToken,
}: {
  config: TuningConfig;
  reload: TuningState['live']['reload'];
  admin: UseTuningAdminResult;
  selected: CalibrationRow | null;
  sharedWith: CalibrationRow[];
  onForgetToken: () => void;
}) {
  // How many edits the last "Reload tuning.json" dropped (R-18); null until one runs, and again once a publish starts.
  const [dropped, setDropped] = useState<number | null>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  // The tray shows a failed publish (useTuningAdmin keeps the error); only a success asks for fresh values.
  const publish = () => {
    setDropped(null);
    void admin.publish().then(
      () => reload(),
      () => undefined,
    );
  };
  // R-18: read tuning.json again, then keep the edits that still apply to it. The admin
  // captured at the click is right: dropStale settles the paths this render knew of. The
  // Reload button goes with the error it answered, so focus moves to the line that says
  // what the reload did.
  const reloadKeepingEdits = () => {
    void reload().then((next) => {
      if (!next) return; // The read failed (the aside now says why), or a newer read replaced it.
      setDropped(admin.dropStale(next));
      noteRef.current?.focus();
    });
  };

  return (
    <div style={COLUMN}>
      <div style={BODY}>
        <SelectedEntry
          config={config}
          pending={admin.pending}
          selected={selected}
          sharedWith={sharedWith}
          stageEdit={admin.stageEdit}
        />
      </div>
      <div style={FOOT}>
        {/* Mounted with the tray, so its text is announced when it arrives. */}
        <div
          ref={noteRef}
          role="status"
          tabIndex={-1}
          style={{...TEXT, fontSize: ADMIN_TYPE.small, marginBottom: dropped === null ? 0 : SPACING.sm}}>
          {dropped === null ? null : reloadNote(dropped)}
        </div>
        <PendingTray
          pending={admin.pending}
          publishDisabled={admin.publishDisabled}
          publishing={admin.publishing}
          result={admin.result}
          error={admin.error}
          onRevert={admin.revertEdit}
          onClear={admin.clear}
          onPublish={publish}
          onReload={reloadKeepingEdits}
          onForgetToken={onForgetToken}
        />
      </div>
    </div>
  );
}

/**
 * The tuning editor beside the calibration analytics: the token gate, the
 * tuning.json read (loading or failed), then the selected rule's entry over
 * the pinned pending tray. A read or a publish GitHub refused for the token
 * offers "Forget token" (R-26), which asks first when edits are pending; any
 * other failed read offers to read tuning.json again.
 */
export function TuningAside({tuning, onSaveToken, onForgetToken, selected, sharedWith}: TuningAsideProps) {
  if (!tuning) {
    return (
      <div style={PADDED}>
        {/* The gate's own h2 is "GitHub token"; this line says what the token opens. */}
        <p style={EYEBROW}>Tuning editor</p>
        <GithubTokenGate onSave={onSaveToken} />
      </div>
    );
  }
  const {live, admin} = tuning;
  const forget = confirmForget(admin.pending.length, onForgetToken);
  if (live.status === 'loading') {
    return (
      <div style={PADDED}>
        <p style={TEXT}>Reading tuning.json from {targetBranch()}…</p>
      </div>
    );
  }
  if (live.status === 'error') {
    return (
      <div style={PADDED}>
        {/* The aside's one alert (Notice's error tone): R2-6 finds it with within(aside).findByRole('alert'). */}
        <Notice tone="error">Could not read tuning.json: {live.error}</Notice>
        {tuningFailureKind(live.error) === 'rejected-token' ? (
          <ForgetTokenOffer onForget={forget} />
        ) : (
          // A failed reload keeps the pending edits (TunedWorkspace holds them): reading again brings them back.
          <CtaButton
            type="button"
            variant="neutral"
            onClick={() => void live.reload()}
            style={{alignSelf: 'flex-start'}}>
            Read tuning.json again
          </CtaButton>
        )}
      </div>
    );
  }
  return (
    <ReadyAside
      config={live.config}
      reload={live.reload}
      admin={admin}
      selected={selected}
      sharedWith={sharedWith}
      onForgetToken={forget}
    />
  );
}
```
Run `pnpm vitest run src/tools/analytics/calibration`. Expected: PASS, including `TuningAside.test.tsx`'s 18 cases and `reloadNote.test.ts`'s 3. Then `pnpm exec eslint src/tools/analytics/calibration`, which prints nothing.

- [ ] **Step 10: Add the aside's stories.** Create `src/tools/analytics/calibration/TuningAside.stories.tsx`. The stories run the real edit hook against the bundled `TUNING`. Publishing needs a real token, so they stop at staging.
```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {TUNING} from 'inkweave-synergy-engine';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {useTuningAdmin} from '../../tuning/useTuningAdmin';
import type {RuleStat} from '../voteAnalyticsTypes';
import type {CalibrationRow} from './calibrationModel';
import {TuningAside, type TuningState} from './TuningAside';

type Live = TuningState['live'];

function row(
  id: string,
  name: string,
  tuningKey: string | null,
  meanGap: number | null,
  category: CalibrationRow['category'] = 'playstyle',
): CalibrationRow {
  const stat: RuleStat = {
    ruleId: id,
    ruleName: name,
    category,
    scoreVotes: 557,
    pairsVoted: 40,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 120,
  };
  return {id, name, category, stat, tuningKey};
}

const RAMP = row('ramp', 'Ramp', 'ramp', -0.57);
const SHIFT = row('shift-targets', 'Shift Targets', 'shift-targets', 0.83, 'direct');
const SINGER = row('singer-songs', 'Singer + Songs', null, 0.4, 'direct');
const LOCATIONS = [
  ['location-at-payoff', 'At Location Payoff'],
  ['location-play-trigger', 'Location Play Trigger'],
  ['location-move-trigger', 'Location Move Trigger'],
  ['location-buff', 'Location Buff'],
  ['location-location-ramp', 'Location Ramp'],
  ['location-move', 'Move to Location'],
  ['location-in-play-check', 'Location In-Play Check'],
  ['location-search', 'Location Search'],
  ['location-boost', 'Location Boost'],
].map(([id, name], i) => row(id, name, 'location-control', -(i + 1) / 10));

// The bundled copy stands in for the live tuning.json, and a reload reads it again.
const READY: Live = {status: 'ready', config: TUNING, reload: () => Promise.resolve(TUNING)};

interface AsideStoryProps {
  live: Live | null;
  selected: CalibrationRow | null;
  sharedWith: CalibrationRow[];
}

/**
 * The real edit hook, so a story stages, reverts and clears edits as the page
 * does. Publishing needs a real token, and Forget token only asks (with edits
 * pending) and then does nothing.
 */
function AsideStory({live, selected, sharedWith}: AsideStoryProps) {
  const admin = useTuningAdmin('ghp_example');
  return (
    <TuningAside
      tuning={live ? {live, admin} : null}
      onSaveToken={() => {}}
      onForgetToken={() => {}}
      selected={selected}
      sharedWith={sharedWith}
    />
  );
}

const meta: Meta<typeof AsideStory> = {
  title: 'Admin/Insights/Calibration/Tuning aside',
  component: AsideStory,
  args: {live: READY, selected: RAMP, sharedWith: [RAMP]},
  decorators: [
    (Story) => (
      // R2-6's aside at a desktop width, scrolling as the page does, so the tray pins to its foot.
      <aside
        aria-label="Tuning editor"
        style={{width: 380, height: 720, overflowY: 'auto', background: ADMIN_COLORS.aside}}>
        <Story />
      </aside>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof AsideStory>;

export const Editing: Story = {};

export const SharedEntry: Story = {
  args: {selected: LOCATIONS[8], sharedWith: LOCATIONS},
};

export const ShiftTiers: Story = {
  args: {selected: SHIFT, sharedWith: [SHIFT]},
};

export const NoCopy: Story = {
  args: {selected: SINGER, sharedWith: []},
};

export const NoSelection: Story = {
  args: {selected: null, sharedWith: []},
};

export const NoToken: Story = {
  args: {live: null},
};

export const Loading: Story = {
  args: {live: {status: 'loading', reload: () => Promise.resolve(null)}},
};

export const ReadError: Story = {
  args: {
    live: {
      status: 'error',
      error: 'GitHub 404 on packages/synergy-engine/src/data/tuning.json: Not Found',
      reload: () => Promise.resolve(null),
    },
  },
};

export const RejectedToken: Story = {
  args: {
    live: {
      status: 'error',
      error: 'GitHub 401 on packages/synergy-engine/src/data/tuning.json: {"message":"Bad credentials"}',
      reload: () => Promise.resolve(null),
    },
  },
};
```
Run `pnpm exec eslint src/tools/analytics/calibration/TuningAside.stories.tsx`, which prints nothing.

- [ ] **Step 11: Run the gates.** `pnpm lint`, `pnpm typecheck` and `pnpm test:run` all pass. In the scratch check (R2-2 applied, R2-1's row type stubbed), the whole suite was 86 files and 752 tests; the real count depends on R2-1 to R2-4c. For a visual check, `pnpm storybook` shows "Admin/Insights/Calibration/Tuning aside" (in `ShiftTiers`, the rows scroll under the pinned foot), "Admin/ForgetTokenOffer" and "TuningAdmin/PendingTray".

- [ ] **Step 12: Commit.** Run it with the Bash tool, and only after the owner approves:
```bash
git add src/tools/tuning/components/TierRow.tsx src/tools/tuning/__tests__/TierRow.test.tsx src/github/ForgetTokenOffer.tsx src/github/ForgetTokenOffer.stories.tsx src/shell/Sidebar.tsx src/tools/tuning/components/PendingTray.tsx src/tools/tuning/components/PendingTray.stories.tsx src/tools/tuning/__tests__/PendingTray.test.tsx src/tools/tuning/__tests__/TuningEditor.test.tsx src/tools/analytics/calibration/reloadNote.ts src/tools/analytics/calibration/__tests__/reloadNote.test.ts src/tools/analytics/calibration/TuningAside.tsx src/tools/analytics/calibration/TuningAside.stories.tsx src/tools/analytics/calibration/__tests__/TuningAside.test.tsx
```
```bash
USER_APPROVED=1 git commit -m "feat(calibration): add the tuning aside (#24)"
```

<!-- Review of R2-5 (2026-10-05), how each note was handled:
- Notes 1 to 7: applied, each checked against the repo first (LinkButton renders a bare <button>, so the revert button's grandparent is the edits list; useLiveTuning's reload keeps the error on screen until a newer read settles; no test in src or in R2-6 to R2-8 queries a lone role="status" in the tray or aside; Sidebar.tsx:108-109 quoted exactly; /calibration becomes a write page in R2-6; sibling story titles are Admin/Insights/Calibration/..., and GithubTokenGate's is Admin/GithubTokenGate). Small additions: the 401 read case also checks that "Read tuning.json again" is not offered, and three long lines (EDITS, the retry button, the story decorator) are wrapped like their neighbours.
- Note 8: not rejected, but not for this file. It asks for header.md's contract addition 10 to list ForgetTokenOffer and reloadNote; this file's Produces block already does. Left to the orchestrator.
- Re-verified in scratchpad/r2-rebase/sandbox-fix-r25b (base files from the repo, R2-2's from sandbox-rev-r25, every block applied by script from this file): Step 3 gives 9 failed | 8 passed (17), with the names listed; Step 4 then passes src/tools/tuning and src/shell; Step 8 fails on the missing import; Step 9 gives 18 + 3 passing in the calibration folder; the full suite is 86 files and 752 tests (750 before the two new cases); tsc -p tsconfig.app.json exits 0; every changed file passes pnpm exec eslint --stdin in the repo; CodeScene scores TuningAside.tsx and PendingTray.tsx 10.0.
-->
