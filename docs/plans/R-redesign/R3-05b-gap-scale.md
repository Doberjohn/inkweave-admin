> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). Read the main plan's decisions (R-28 to R-56 for R3), corrections, global constraints and shared interfaces, then the R3 header, first.

> **Re-base notes (R3-5b, 2026-10-06).** Re-based from the outline's "Task R3-5b: Shared GapScale" (`R3-card-analytics.md:1933-2143`, written 2026-10-01 against the planned R1 code). This version is written against main @ `aea40b4` (R1 and R2 as built, PRs #25, #27 and #28), pin `upstream/inkweave` @ `bc877e1`, and decisions R-50 and R-53.
> - **Where the track lives (R-53).** The new file is `src/tools/analytics/GapScale.tsx`, beside `verdict.ts`, not `src/ui/GapScale.tsx`. Its test is `src/tools/analytics/__tests__/GapScale.test.tsx`.
>   - Why: no production file in `src/ui`, `src/charts`, `src/theme` or `src/shell` imports from `src/tools`. Only a story (`src/charts/Charts.stories.tsx:5`) and a test (`src/shell/AdminShell.test.tsx:4`) do. Every `src/ui` primitive imports only the bridge, the theme and `./format` (`BiasBar.tsx:1-2`). The track needs `scalePercent`, which stays in `verdict.ts`, because the shared contract lists it there and tasks may not rename. Both callers sit under `src/tools/analytics/`: the Overview card now, and R3-6a's calibration panel (`cards/`) later. The shared analytics pieces already live at that root: `PairList`, `VoteDetailTable`, `DimensionParticipation`, `verdict.ts`, `gapColor.ts` and `biasCopy.ts`.
>   - So the imports become `'./verdict'`, `'../../app-bridge'` and `'../../theme/adminTheme'`. `CalibrationCard` imports `{GapScale} from '../GapScale'`.
> - **The verdict phrase (R-50), new to this task.**
>   - `Verdict` gains `phrase: string`. The phrase completes "The engine …":
>     - "is well-calibrated";
>     - "runs generous";
>     - "runs harsh";
>     - "has too few score votes to judge", when there is no gap.
>   - Today the Overview's headline prints the bare word (`CalibrationCard.tsx:83`), so it can read "The engine well-calibrated" or "The engine not enough data". The card switches to `verdict.phrase`. The phrase span keeps `wordColor`, so the whole phrase is coloured, as the prototype colours "is well-calibrated" (`dc.html:948`).
>   - `word` stays. `calibrationSubtitle` prints it ("Mean gap −0.30 · well-calibrated · 2,054 votes", `calibrationModel.ts:217`), and so do its tests (`calibrationModel.test.ts:543-548`, `CalibrationPage.test.tsx:212`). None of them changes.
>   - Complexity stays where it is. `verdictFor`'s cyclomatic complexity stays at 5: a directional phrase is its word, so the function adds no branch (`const word = …; return {word, phrase: word, …}`).
>   - Three tests change:
>     - `verdict.test.ts`'s four `toEqual` objects gain `phrase` (`:7`, `:12`, `:17`, `:22`);
>     - `OverviewView.test.tsx:45` looks for "is well-calibrated";
>     - `CalibrationCard.test.tsx` gains a four-row `it.each` that pins the headline sentence and its colour.
> - **The scale's existing test is R2-7's, not R1-8's.** R2-7 (`41d454a`) ported `VerdictHero.test.tsx`'s scale check into `overview/__tests__/CalibrationCard.test.tsx`. Its comment at `:6-7` says the card "now draws the only gap scale", which stops being true once the track is shared. The test stays as the card's pass-through check, with the comment reworded. The file is in Files and in the `git add`.
> - **One change to the moved code beyond the export.** The doc comment said "The number above says the same thing". That is true on the Overview only: R3-6a's panel prints no number above the track. It now states what every caller owes: print the gap as text beside the track. Otherwise `TRACK`, `SCALE_LABEL` and the body of `GapScale` are R1-8's, character for character. The `export`s and the named `GapScaleProps` are new.
> - **Also new:**
>   - **A story.** `GapScale.stories.tsx`, titled "Admin/Insights/Gap scale". Today the track shows only inside the Overview story. `Primitives.stories.tsx` stays untouched, because the track isn't a `src/ui` primitive.
>   - **No docs step.** The plan commit records the `verdict.ts` row, the `GapScale.tsx` row and the `phrase`/`GapScale` contract lines in `R-redesign.md`, as R2's plan commit recorded R2's contract. This task edits no plan file. CLAUDE.md needs no change.
> - **Past tense and citations.**
>   - R2-7 deleted `VerdictHero.tsx` and `RuleCalibrationTable.tsx` (`41d454a`).
>   - The moved code is `CalibrationCard.tsx:10-53` as built at `aea40b4`, cited by line rather than as "R1-8 Step 17".
>   - Since 8c5fa7e rewrapped `:60-66`, the file's only other change, the outline's "Before" block still matches `:1-53` exactly (the audit diffed it).
> - **Order and dependencies.** This task now runs third: R3-1, then R3-1a, then R3-5b. It needs nothing from R3 and touches no file that R3-1 or R3-1a touches. R3-6a consumes `GapScale` and `phrase`.
> - **Commit.** `fix(analytics): finish the verdict sentence and share the gap scale (#24)`, one commit as every R3 task, in two Bash calls. The header's task-order row takes this message ("When the plan is assembled").
> - **Not taken:**
>   - Deriving `color` inside `GapScale` from `verdictFor(meanGap).numberColor`. Both callers pass exactly that, but it changes R1-8's props, and nobody asked for it.
>   - Tinting `TRACK` with `ADMIN_COLORS.over` and `.under` instead of `COLORS.error` and `.success`. The pixels would be identical, but the move would stop being a pure copy.
>   - `DataAsOf`. R-54 put it in R3-1a.
>   - biasCopy's no-gap read line ("Not enough scored votes yet to assess calibration."). R-50 doesn't touch it.
>   - An Overview story with no gap. `CalibrationCard.test.tsx` pins that headline, and the new story's `NoGap` shows the track.
> - **Verified in a scratch sandbox** (`scratchpad/r3-rebase/sandbox-R3-5b`).
>   - **Setup.** A copy of `src` at `aea40b4`, with junctions to the repo's `node_modules` and `upstream`. Vite's `cacheDir` and the tsbuildinfo were moved into the sandbox, and `server.fs.strict` was off so the junctioned files load.
>   - **Baseline.** `verdict.test.ts` plus the overview folder: 7 files and 61 tests passed.
>   - **Step 3.** It fails with the import error quoted there.
>   - **Step 6.** 7 files and 57 tests passed.
>   - **Step 8.** 3 files failed, `7 failed | 18 passed (25)`, with exactly the failures listed there.
>   - **Step 10.** 8 files and 68 tests passed. The two calibration files that read `word` gave 2 files and 107 tests passed, unchanged.
>   - **The whole `vitest run src`.** 93 files and 1,057 tests passed.
>   - **Typecheck.** `tsc -p tsconfig.app.json --noEmit` is clean, the story included.
>   - **Lint.** `pnpm exec eslint --max-warnings 0 --stdin` (run from the repo) is clean on all eight source files.
>   - **CodeScene.** Its MCP (1.1.3, laxer than the PR gate's server) scored `GapScale.tsx`, `verdict.ts`, `CalibrationCard.tsx`, `GapScale.stories.tsx` and the three test files 10.0, with no findings.
>     - `GapScale` takes one argument, its props object, and has a cyclomatic complexity of 2.
>     - `verdict.ts` gains no function and no argument.
> - **When the plan is assembled:**
>   - **The R3 header.** The re-based header already states this task's contract (contract addition 2), the card page's headline and its no-verdict wording (the "Minimum-vote guard"), and its table rows. One header edit, which the header's task-order row already carries:
>     - **The task-order row's commit message** becomes this task's, `fix(analytics): finish the verdict sentence and share the gap scale (#24)`, in place of `refactor(analytics): share GapScale and give the verdict a phrase (#24)`. The task changes text people see on the Overview, and R-50 calls it a fix ("Fix it in R3-5b").
>   - **What R3-6a adds when it lands.** R3-6a is the task that needs R3-5b and draws the card page's calibration panel.
>     - It adds the card page to `verdict.ts`'s doc comment (`:23-25` after this task).
>     - It adds the card page's text twin of the gap (its Mean gap KPI and read line) to `GapScale`'s doc comment, as the second example of what callers print.
>     - It imports `{GapScale} from '../GapScale'`.
>     - It cites `verdict.ts:37` (the in-band verdict after this task), not `VerdictHero.tsx:33`.

### Task R3-5b: Shared GapScale, and the verdict phrase (R-50, R-53)

R1-8 keeps the over/under track private to the Overview's calibration card. The per-card verdict (R3-6a) draws the same track, so this task moves it beside `verdict.ts`, and `CalibrationCard` imports it from there. One track, one band and one clamp then serve both pages. The same card's headline prints the verdict's bare word after "The engine", so it can read "The engine well-calibrated". `Verdict` gains a phrase that completes the sentence, and the card prints it.

**Files:**
- Create `src/tools/analytics/GapScale.tsx` and `src/tools/analytics/GapScale.stories.tsx`.
- Test, create: `src/tools/analytics/__tests__/GapScale.test.tsx`.
- Modify `src/tools/analytics/overview/CalibrationCard.tsx`:
  - the imports (`:1-8`);
  - the `TRACK`, `SCALE_LABEL` and `GapScale` block (`:10-53`), which moves out;
  - the doc comment (`:60-66`);
  - the headline (`:83`).
- Modify `src/tools/analytics/verdict.ts`: `Verdict` (`:8-12`), the doc comment's last sentence (`:20-22`) and `verdictFor` (`:24-31`).
- Test, modify:
  - `src/tools/analytics/__tests__/verdict.test.ts`: the four `toEqual` objects (`:7`, `:12`, `:17`, `:22`);
  - `src/tools/analytics/overview/__tests__/CalibrationCard.test.tsx`: the imports (`:2-4`), the comment (`:6-7`) and a new `it.each` after `:23`;
  - `src/tools/analytics/overview/__tests__/OverviewView.test.tsx`: `:45`.

**Interfaces:**
- **Consumes:**
  - From `src/tools/analytics/verdict.ts` (R1-8): `scalePercent(meanGap: number | null): number | null` (`:38-42`, clamped to ±`SCALE_CLAMP` = 1.5, `:6`), and `verdictFor`.
  - From the bridge: `COLORS` (`error`, `success`, `textMuted`), `SPACING`, `FONTS` and `hexRgba` (`app-bridge.ts:17`, `:31`, `:36` after R3-1).
  - From `src/theme/adminTheme.ts`:
    - `ADMIN_COLORS`: `page`, `barTrack` and `muted`, plus `text` and `divider` for the card;
    - `ADMIN_TYPE`: `label`, plus `sectionTitle`, `hero`, `body` and `small` for the card;
    - `ADMIN_RADIUS.tag`.
- **Produces:**
  ```ts
  // src/tools/analytics/verdict.ts: one field added, nothing renamed
  export interface Verdict {
    word: string;     // the bare verdict, for a summary line: 'well-calibrated' | 'runs generous' | 'runs harsh' | 'not enough data'
    phrase: string;   // completes "The engine …": 'is well-calibrated' | 'runs generous' | 'runs harsh' | 'has too few score votes to judge'
    wordColor: string;
    numberColor: string;
  }
  export function verdictFor(meanGap: number | null): Verdict; // same bands and colours; a directional phrase equals its word

  // src/tools/analytics/GapScale.tsx (R-53)
  export interface GapScaleProps {meanGap: number | null; color: string} // R1-8's prop names; callers pass verdictFor(meanGap).numberColor
  export function GapScale(props: GapScaleProps);                         // no return annotation, as every admin component
  // The track is aria-hidden: every caller prints the gap as text beside it.
  ```
  - `CalibrationCard({meanGap, accuracySentiment})` keeps its props. Its headline reads "The engine {phrase}", with the phrase in `wordColor`.
  - The story file `GapScale.stories.tsx` is titled "Admin/Insights/Gap scale" and holds the stories `WellCalibrated`, `RunsGenerous`, `NoGap` and `Range`.

- [ ] **Step 1: Check what this task builds on**

From the repo root, on `feature/24-redesign-r3`:

```bash
grep -n "^function GapScale" src/tools/analytics/overview/CalibrationCard.tsx
grep -n "phrase" src/tools/analytics/verdict.ts
ls src/tools/analytics/GapScale.tsx src/ui/GapScale.tsx
```

Expected:
- The first `grep` prints `24:function GapScale({meanGap, color}: {meanGap: number | null; color: string}) {`.
- The second prints nothing.
- `ls` prints `No such file or directory` for both paths.

If any of these differs, stop and report: the track has already moved, or the verdict has already changed.

If this checkout has never built the engine, run `pnpm build:engine` once. The tests below reach the bridge.

- [ ] **Step 2: Write the failing test for the shared track**

Create `src/tools/analytics/__tests__/GapScale.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {COLORS} from '../../../app-bridge';
import {GapScale} from '../GapScale';

/** The track's marks: the centre tick, then the dot when there is one. */
function marks(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[aria-hidden="true"] > div'));
}

describe('GapScale', () => {
  it('names its two ends and hides the track from assistive tech', () => {
    const {container} = render(<GapScale meanGap={0.75} color={COLORS.success} />);
    expect(screen.getByText('over-rates')).toBeInTheDocument();
    expect(screen.getByText('under-rates')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('puts the dot at the gap in the colour it is given, clamped to the ends', () => {
    const {container, rerender} = render(<GapScale meanGap={0.75} color={COLORS.success} />);
    expect(marks(container)[1]).toHaveStyle({left: '75%', backgroundColor: COLORS.success});
    rerender(<GapScale meanGap={-3} color={COLORS.error} />);
    expect(marks(container)[1]).toHaveStyle({left: '0%', backgroundColor: COLORS.error});
  });

  it('draws only the centre tick without a gap', () => {
    const {container} = render(<GapScale meanGap={null} color={COLORS.textMuted} />);
    expect(marks(container)).toHaveLength(1);
    expect(marks(container)[0]).toHaveStyle({left: '50%'});
  });
});
```

Notes on the test:
- The numbers are `verdict.test.ts`'s own (`:34`, `:40`): `scalePercent(0.75)` is 75, and `scalePercent(-3)` clamps to 0.
- The track is the only `aria-hidden` element, so `marks` returns the tick first and then the dot.
- jsdom expands the dot's `background: #4ade80` into `backgroundColor: rgb(74, 222, 128)`, and `toHaveStyle` normalises the expected hex the same way.

- [ ] **Step 3: Run it and watch it fail**

```bash
pnpm vitest run src/tools/analytics/__tests__/GapScale.test.tsx
```

Expected: FAIL, with `Error: Failed to resolve import "../GapScale" from "src/tools/analytics/__tests__/GapScale.test.tsx". Does the file exist?` and `Test Files  1 failed (1)`.

- [ ] **Step 4: Create the shared track**

Create `src/tools/analytics/GapScale.tsx`.
- `TRACK`, `SCALE_LABEL` and the body of `GapScale` are `CalibrationCard.tsx:10-53`, character for character.
- New: the `export`s, the named `GapScaleProps` (it was an inline type), and the doc comment's last sentence. That sentence used to read "The number above says the same thing, so the track is hidden from assistive tech". It now states what every caller owes.

```tsx
import type {CSSProperties} from 'react';
import {COLORS, SPACING, hexRgba} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../theme/adminTheme';
import {scalePercent} from './verdict';

/**
 * The track tints toward the over-rates colour on the left and the under-rates
 * colour on the right: COLORS.error and COLORS.success, as verdictFor and
 * gapColor use them.
 */
const TRACK = `linear-gradient(90deg, ${hexRgba(COLORS.error, 0.35)}, ${ADMIN_COLORS.barTrack} 30%, ${ADMIN_COLORS.barTrack} 70%, ${hexRgba(COLORS.success, 0.35)})`;

const SCALE_LABEL: CSSProperties = {fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

export interface GapScaleProps {
  meanGap: number | null;
  color: string;
}

/**
 * The diverging over/under scale: a centre tick, and a dot at the mean gap
 * (clamped by scalePercent), left out when there is no gap. Every caller
 * prints the gap as text beside the track (the Overview card's hero number,
 * for one), so the track is hidden from assistive tech.
 */
export function GapScale({meanGap, color}: GapScaleProps) {
  const dot = scalePercent(meanGap);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: SPACING.md}}>
      <span style={SCALE_LABEL}>over-rates</span>
      <div
        aria-hidden="true"
        style={{position: 'relative', flex: 1, height: 6, borderRadius: ADMIN_RADIUS.tag, background: TRACK}}>
        <div style={{position: 'absolute', left: '50%', top: -4, width: 1, height: 14, background: ADMIN_COLORS.muted}} />
        {dot != null && (
          <div
            style={{
              position: 'absolute',
              left: `${dot}%`,
              top: -3,
              width: 12,
              height: 12,
              boxSizing: 'border-box',
              borderRadius: '50%',
              background: color,
              border: `2px solid ${ADMIN_COLORS.page}`,
              transform: 'translateX(-50%)',
            }}
          />
        )}
      </div>
      <span style={SCALE_LABEL}>under-rates</span>
    </div>
  );
}
```

Notes on the file:
- It passes every `inkweave/*` rule where it stands today. The radius is `ADMIN_RADIUS.tag`, `'50%'` isn't a token value, and the colours are bridged tokens.
- `react-refresh/only-export-components` allows the exported interface beside the component.
- `GapScale` takes one argument, its props object, and its one branch (`dot != null &&`) gives it a cyclomatic complexity of 2. Keep the props object: no positional `(meanGap, color)`, and no bag of label strings or sizes.

- [ ] **Step 5: Point CalibrationCard at it**

In `src/tools/analytics/overview/CalibrationCard.tsx`, the imports, `:1-8`. Current:

```tsx
import type {CSSProperties} from 'react';
import {COLORS, FONTS, SPACING, hexRgba} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {biasCopy} from '../biasCopy';
import {scalePercent, verdictFor} from '../verdict';
import {PanelLink} from './PanelLink';
```

New:

```tsx
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {biasCopy} from '../biasCopy';
import {GapScale} from '../GapScale';
import {verdictFor} from '../verdict';
import {PanelLink} from './PanelLink';
```

Then delete `:10-53`, from the `/**` above `const TRACK` through the `}` that closes `function GapScale`, with the blank line after it. That is exactly the code Step 4 reproduces. The file then goes on from `interface CalibrationCardProps`, and its `<GapScale meanGap={meanGap} color={verdict.numberColor} />` (now `:51`) renders the shared track.

`COLORS`, `hexRgba`, `ADMIN_RADIUS`, `scalePercent` and `CSSProperties` leave the imports, because only the moved code used them. Check:

```bash
grep -nE "TRACK|SCALE_LABEL|scalePercent|hexRgba|CSSProperties|ADMIN_RADIUS|\bCOLORS\." src/tools/analytics/overview/CalibrationCard.tsx
```

Expected: no output. The `\b` keeps `ADMIN_COLORS.` out of the last alternative. Before the edit, the same command prints the moved block's lines, `COLORS.error` and `COLORS.success` among them.

In `src/tools/analytics/overview/__tests__/CalibrationCard.test.tsx`, `:6-7`. Current:

```tsx
// The scale's dot is the card's only round element. Ported from VerdictHero.test.tsx,
// which retired with the hero (R2-7): the card now draws the only gap scale.
```

New:

```tsx
// The scale's dot is the card's only round element. GapScale.test.tsx covers the track
// itself; this checks that the card passes its gap through.
```

- [ ] **Step 6: Run the track's tests and the Overview's**

```bash
pnpm vitest run src/tools/analytics/__tests__/GapScale.test.tsx src/tools/analytics/overview
```

Expected: `Test Files  7 passed (7)` and `Tests  57 passed (57)`. That is `GapScale.test.tsx` (3) and the overview folder's six files (54). The folder's tests pass unchanged, because the card renders the same markup.

If R3-1a changed the overview folder's tests, the counts move by the same amount.

- [ ] **Step 7: Write the failing tests for the verdict phrase (R-50)**

In `src/tools/analytics/__tests__/verdict.test.ts`, each `toEqual` gains `phrase`.

`:6-8`. Current:

```ts
  it('has no verdict without a gap', () => {
    expect(verdictFor(null)).toEqual({word: 'not enough data', wordColor: COLORS.textMuted, numberColor: COLORS.textMuted});
  });
```

New:

```ts
  it('has no verdict without a gap', () => {
    expect(verdictFor(null)).toEqual({
      word: 'not enough data',
      phrase: 'has too few score votes to judge',
      wordColor: COLORS.textMuted,
      numberColor: COLORS.textMuted,
    });
  });
```

`:12`. Current:

```ts
      expect(verdictFor(gap)).toEqual({word: 'well-calibrated', wordColor: COLORS.success, numberColor: COLORS.textMuted});
```

New:

```ts
      expect(verdictFor(gap)).toEqual({
        word: 'well-calibrated',
        phrase: 'is well-calibrated',
        wordColor: COLORS.success,
        numberColor: COLORS.textMuted,
      });
```

`:17`. Current:

```ts
    expect(verdictFor(-CALIBRATION_BAND)).toEqual({word: 'runs generous', wordColor: COLORS.error, numberColor: COLORS.error});
```

New:

```ts
    expect(verdictFor(-CALIBRATION_BAND)).toEqual({
      word: 'runs generous',
      phrase: 'runs generous',
      wordColor: COLORS.error,
      numberColor: COLORS.error,
    });
```

`:22`. Current:

```ts
    expect(verdictFor(CALIBRATION_BAND)).toEqual({word: 'runs harsh', wordColor: COLORS.success, numberColor: COLORS.success});
```

New:

```ts
    expect(verdictFor(CALIBRATION_BAND)).toEqual({
      word: 'runs harsh',
      phrase: 'runs harsh',
      wordColor: COLORS.success,
      numberColor: COLORS.success,
    });
```

The `.word` checks at `:18` and `:23` and the `scalePercent` block stay as they are.

Replace `src/tools/analytics/overview/__tests__/CalibrationCard.test.tsx` with the following. It keeps Step 5's comment and the existing test, adds `screen` and `COLORS` to the imports, and adds one `it.each`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {COLORS} from '../../../../app-bridge';
import {CalibrationCard} from '../CalibrationCard';

// The scale's dot is the card's only round element. GapScale.test.tsx covers the track
// itself; this checks that the card passes its gap through.
const DOT = '[style*="border-radius: 50%"]';

describe('CalibrationCard', () => {
  it('marks the gap on the scale, and leaves the mark out when there is no data', () => {
    // The card's "Open calibration" link needs a router.
    const {container, rerender} = render(<CalibrationCard meanGap={-0.3} accuracySentiment={null} />, {
      wrapper: MemoryRouter,
    });
    const dots = container.querySelectorAll(DOT);
    expect(dots).toHaveLength(1);
    // scalePercent(-0.3): 0.3 of the 1.5 clamp left of centre.
    expect(dots[0]).toHaveStyle({left: '40%'});

    rerender(<CalibrationCard meanGap={null} accuracySentiment={null} />);
    expect(container.querySelectorAll(DOT)).toHaveLength(0);
  });

  // R-50: the headline is a sentence for every gap, never "The engine well-calibrated".
  it.each<[number | null, string, string]>([
    [-0.3, 'is well-calibrated', COLORS.success],
    [-0.93, 'runs generous', COLORS.error],
    [0.7, 'runs harsh', COLORS.success],
    [null, 'has too few score votes to judge', COLORS.textMuted],
  ])('finishes "The engine …" for a gap of %s: %s', (meanGap, phrase, color) => {
    render(<CalibrationCard meanGap={meanGap} accuracySentiment={null} />, {wrapper: MemoryRouter});
    expect(screen.getByText('The engine').textContent).toBe(`The engine ${phrase}`);
    expect(screen.getByText(phrase)).toHaveStyle({color});
  });
});
```

How the headline test finds its text:
- `getByText('The engine')` finds the headline's `<p>`. Testing Library matches an element's own text nodes, and the `<p>`'s own text is "The engine " (the phrase sits in a child `<span>`).
- No read line has that exact text. Each is a whole sentence ("The engine rates pairs about …"), or "Not enough scored votes yet …" when there is no gap.
- `textContent` then reads the whole sentence.
- The explicit tuple type keeps `meanGap` as `number | null` (R2's `it.each` idiom).

In `src/tools/analytics/overview/__tests__/OverviewView.test.tsx`, `:45`. The fixture's mean gap is −0.30. Current:

```tsx
    expect(screen.getByText('well-calibrated')).toBeInTheDocument();
```

New:

```tsx
    expect(screen.getByText('is well-calibrated')).toBeInTheDocument();
```

- [ ] **Step 8: Run them and watch them fail**

```bash
pnpm vitest run src/tools/analytics/__tests__/verdict.test.ts src/tools/analytics/overview/__tests__/CalibrationCard.test.tsx src/tools/analytics/overview/__tests__/OverviewView.test.tsx
```

Expected: `Test Files  3 failed (3)` and `Tests  7 failed | 18 passed (25)`. The seven failures are:
- `verdict.test.ts`: all four `verdictFor` tests, each an `AssertionError: expected { word: '…', …(2) } to deeply equal { word: '…', …(3) }`. The objects have no `phrase` yet.
- `CalibrationCard.test.tsx`:
  - `finishes "The engine …" for a gap of -0.3: is well-calibrated`, with `Received: "The engine well-calibrated"`;
  - `… for a gap of null: has too few score votes to judge`, with `Received: "The engine not enough data"`.
  - The `runs generous` and `runs harsh` rows already pass: a directional word already reads as a sentence.
- `OverviewView.test.tsx`: `reads the calibration verdict and links to Calibration`, with `Unable to find an element with the text: is well-calibrated`.

- [ ] **Step 9: Give the verdict its phrase, and print it**

In `src/tools/analytics/verdict.ts`, `Verdict`, `:8-12`. Current:

```ts
export interface Verdict {
  word: string;
  wordColor: string;
  numberColor: string;
}
```

New:

```ts
export interface Verdict {
  /** The bare verdict, for a summary line: "well-calibrated", "runs harsh", "not enough data". */
  word: string;
  /** The verdict as it follows "The engine", for a headline: "is well-calibrated", "has too few score votes to judge". */
  phrase: string;
  wordColor: string;
  numberColor: string;
}
```

`:20-31`, the end of the doc comment and `verdictFor`. Current:

```ts
 * reads "well-calibrated" with the lean noted underneath. The Overview's
 * calibration card and the calibration page's subtitle (calibrationSubtitle)
 * both read it.
 */
export function verdictFor(meanGap: number | null): Verdict {
  if (meanGap == null) return {word: 'not enough data', wordColor: COLORS.textMuted, numberColor: COLORS.textMuted};
  if (Math.abs(meanGap) < CALIBRATION_BAND) {
    return {word: 'well-calibrated', wordColor: COLORS.success, numberColor: COLORS.textMuted};
  }
  const dirColor = meanGap < 0 ? COLORS.error : COLORS.success;
  return {word: meanGap < 0 ? 'runs generous' : 'runs harsh', wordColor: dirColor, numberColor: dirColor};
}
```

New:

```ts
 * reads "well-calibrated" with the lean noted underneath. The calibration
 * page's subtitle (calibrationSubtitle) reads the word, and the Overview's
 * calibration card the phrase.
 */
export function verdictFor(meanGap: number | null): Verdict {
  if (meanGap == null) {
    return {
      word: 'not enough data',
      phrase: 'has too few score votes to judge',
      wordColor: COLORS.textMuted,
      numberColor: COLORS.textMuted,
    };
  }
  if (Math.abs(meanGap) < CALIBRATION_BAND) {
    return {word: 'well-calibrated', phrase: 'is well-calibrated', wordColor: COLORS.success, numberColor: COLORS.textMuted};
  }
  const dirColor = meanGap < 0 ? COLORS.error : COLORS.success;
  const word = meanGap < 0 ? 'runs generous' : 'runs harsh';
  return {word, phrase: word, wordColor: dirColor, numberColor: dirColor};
}
```

How the new code is built:
- A directional verdict already reads as a predicate ("The engine runs harsh"), so its phrase is its word. The function gains no branch, and its cyclomatic complexity stays at 5.
- `word` is unchanged for every gap, so `calibrationSubtitle` (`calibrationModel.ts:217`) and its tests stay as they are.

In `src/tools/analytics/overview/CalibrationCard.tsx`, the doc comment (`:15-21` after Step 5, `:60-66` before it). Current:

```tsx
/**
 * The Overview's engine-calibration card: the verdict sentence and read line
 * (verdictFor and biasCopy), the mean gap as the hero number, the over/under
 * scale and the accuracy sentiment. The verdict word is marked by colour only:
 * the app ships no italic Tinos face and sets font-synthesis: none, so an
 * italic would render upright anyway.
 */
```

New:

```tsx
/**
 * The Overview's engine-calibration card: the verdict sentence and read line
 * (verdictFor's phrase and biasCopy), the mean gap as the hero number, the
 * over/under scale (GapScale) and the accuracy sentiment. The verdict phrase is
 * marked by colour only: the app ships no italic Tinos face and sets
 * font-synthesis: none, so an italic would render upright anyway.
 */
```

The headline (`:38` after Step 5, `:83` before it). Current:

```tsx
              The engine <span style={{color: verdict.wordColor}}>{verdict.word}</span>
```

New:

```tsx
              The engine <span style={{color: verdict.wordColor}}>{verdict.phrase}</span>
```

The whole file after this step, for comparison:

```tsx
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {biasCopy} from '../biasCopy';
import {GapScale} from '../GapScale';
import {verdictFor} from '../verdict';
import {PanelLink} from './PanelLink';

interface CalibrationCardProps {
  meanGap: number | null;
  accuracySentiment: number | null;
}

/**
 * The Overview's engine-calibration card: the verdict sentence and read line
 * (verdictFor's phrase and biasCopy), the mean gap as the hero number, the
 * over/under scale (GapScale) and the accuracy sentiment. The verdict phrase is
 * marked by colour only: the app ships no italic Tinos face and sets
 * font-synthesis: none, so an italic would render upright anyway.
 */
export function CalibrationCard({meanGap, accuracySentiment}: CalibrationCardProps) {
  const verdict = verdictFor(meanGap);
  const {read} = biasCopy(meanGap);
  return (
    <Panel title="Engine calibration" action={<PanelLink to="/calibration">Open calibration →</PanelLink>}>
      <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.lg}}>
        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: SPACING.xxl}}>
          <div style={{flex: '1 1 220px'}}>
            <p
              style={{
                margin: 0,
                fontFamily: FONTS.hero,
                fontSize: ADMIN_TYPE.sectionTitle,
                lineHeight: 1.15,
                color: ADMIN_COLORS.text,
              }}>
              The engine <span style={{color: verdict.wordColor}}>{verdict.phrase}</span>
            </p>
            <p style={{margin: `${SPACING.sm}px 0 0`, maxWidth: 340, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted}}>
              {read}
            </p>
          </div>
          <div style={{textAlign: 'right'}}>
            <div style={{fontFamily: FONTS.hero, fontSize: ADMIN_TYPE.hero, lineHeight: 1, color: verdict.numberColor}}>
              {fmtGap(meanGap)}
            </div>
            <div style={{fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>mean gap</div>
          </div>
        </div>
        <GapScale meanGap={meanGap} color={verdict.numberColor} />
        <p
          style={{
            margin: 0,
            paddingTop: SPACING.md,
            borderTop: `1px solid ${ADMIN_COLORS.divider}`,
            fontSize: ADMIN_TYPE.small,
            color: ADMIN_COLORS.muted,
          }}>
          Accuracy sentiment <strong style={{color: ADMIN_COLORS.text}}>{fmtGap(accuracySentiment)}</strong> (thumbs:
          too-low vs too-high)
        </p>
      </div>
    </Panel>
  );
}
```

Contrast is unchanged. The phrase takes the colours the word took: `COLORS.success`, `COLORS.error` or `COLORS.textMuted` on the panel, never `textDim`.

- [ ] **Step 10: Run them and watch them pass**

```bash
pnpm vitest run src/tools/analytics/__tests__/verdict.test.ts src/tools/analytics/__tests__/GapScale.test.tsx src/tools/analytics/overview
```

Expected: `Test Files  8 passed (8)` and `Tests  68 passed (68)`. That is `verdict.test.ts` (7), `GapScale.test.tsx` (3) and the overview folder (58: Step 6's 54 plus the four headline rows).

Then the two files that print `word`:

```bash
pnpm vitest run src/tools/analytics/calibration/__tests__/calibrationModel.test.ts src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx
```

Expected: `Test Files  2 passed (2)` and `Tests  107 passed (107)`, unchanged. The subtitle still reads "Mean gap −0.30 · well-calibrated · 2,054 votes".

- [ ] **Step 11: Add the track's story**

Create `src/tools/analytics/GapScale.stories.tsx`:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../app-bridge';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {fmtGap} from '../../ui/format';
import {GapScale} from './GapScale';
import {verdictFor} from './verdict';

const meta: Meta<typeof GapScale> = {
  title: 'Admin/Insights/Gap scale',
  component: GapScale,
  tags: ['autodocs'],
  // A calibration panel's width. .storybook/preview.tsx mounts AdminStyles and
  // the page background.
  decorators: [
    (Story) => (
      <div style={{maxWidth: 480, padding: SPACING.xxxl, color: ADMIN_COLORS.text, fontFamily: FONTS.body}}>
        <Story />
      </div>
    ),
  ],
  // Both callers colour the dot with the verdict's number colour.
  args: {meanGap: -0.3, color: verdictFor(-0.3).numberColor},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Inside the band: the dot takes the neutral number colour. */
export const WellCalibrated: Story = {};

/** Past the band on the over-rates side: the dot turns the over-rates colour. */
export const RunsGenerous: Story = {args: {meanGap: -0.93, color: verdictFor(-0.93).numberColor}};

/** No gap: the centre tick alone. */
export const NoGap: Story = {args: {meanGap: null, color: verdictFor(null).numberColor}};

const GAPS = [-4, -1.5, -0.93, -0.5, -0.3, 0, 0.3, 0.5, 0.7, 1.5, 4, null];

/** Every band, both clamped ends and no gap, each row labelled with the gap it marks. */
export const Range: Story = {
  render: () => (
    <div style={{display: 'grid', gap: SPACING.lg}}>
      {GAPS.map((gap) => (
        <div
          key={String(gap)}
          style={{display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr)', gap: SPACING.md, alignItems: 'center'}}>
          <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{fmtGap(gap)}</span>
          <GapScale meanGap={gap} color={verdictFor(gap).numberColor} />
        </div>
      ))}
    </div>
  ),
};
```

Notes on the story:
- **Its place.** It follows `PairList.stories.tsx`'s frame and title family. `Range` lays its rows out as `Primitives.stories.tsx`'s `BiasBar` panel does (`:157-166`). Its gaps reach both clamped ends (±1.5 and ±4) and both band edges (±0.5).
- **The meta's `args`.** They supply the two required props, so `Range`, which renders its own rows, still typechecks under `StoryObj<typeof meta>`.

- [ ] **Step 12: Lint, typecheck and the full suite**

```bash
pnpm lint
pnpm typecheck
pnpm test:run
```

Expected: all three exit 0, with no lint warnings.

- [ ] **Step 13: Look at it in Storybook (when a browser is available)**

1. Start Storybook with the preview tool's `admin-storybook` configuration (`.claude/launch.json`), not `pnpm storybook` in a shell.
2. Open `http://localhost:6007/iframe.html?id=admin-insights-gap-scale--range&viewMode=story`. Check three things:
   - The rows from −4 to +4 move the dot left to right.
   - −4 and −1.5 sit on the left end, and +1.5 and +4 on the right.
   - The "—" row shows the centre tick alone.
3. Open `http://localhost:6007/iframe.html?id=admin-insights-overview--full-data&viewMode=story`. The calibration card reads "The engine is well-calibrated", with the whole phrase in green, over the same track as before.
4. Stop Storybook with the preview tool (`mcp__Claude_Browser__preview_list`, then `mcp__Claude_Browser__preview_stop`). A running preview server makes the pre-commit hook's Vitest fail to start its workers.

If no browser is available, record this check as pending with the owner, and say so in the report.

- [ ] **Step 14: Check Code Health (when the CodeScene MCP is available)**

Run `mcp__codescene__code_health_review` on `src/tools/analytics/GapScale.tsx`, `src/tools/analytics/verdict.ts` and `src/tools/analytics/overview/CalibrationCard.tsx`.

Expected: 10.0 with no findings for each. The local tool is laxer than the PR gate, so a 10.0 here isn't proof. R3-9 runs `analyze_change_set` before the push.

- [ ] **Step 15: Commit**

Use the Bash tool, never PowerShell, and only after the owner approves. Run the two commands as two separate Bash calls, and don't pipe either one. Stage only these paths, and never `public/admin-data/`.

```bash
git add src/tools/analytics/GapScale.tsx src/tools/analytics/GapScale.stories.tsx src/tools/analytics/__tests__/GapScale.test.tsx src/tools/analytics/verdict.ts src/tools/analytics/__tests__/verdict.test.ts src/tools/analytics/overview/CalibrationCard.tsx src/tools/analytics/overview/__tests__/CalibrationCard.test.tsx src/tools/analytics/overview/__tests__/OverviewView.test.tsx
```

```bash
USER_APPROVED=1 git commit -m "fix(analytics): finish the verdict sentence and share the gap scale (#24)"
```

Husky's pre-commit runs lint and the tests. If Vitest fails to start its workers under load, stop this session's preview servers, wait for other sessions' runs to finish, and retry.

<!--
Review of 2026-10-06, notes not applied as written:
- Note 1 (commit message): kept the task's fix(analytics) message, the review's preferred option. Its other half, replacing the header's task-order row (R3-card-analytics.md:647), is outside this file, so it is recorded as a hand-off under "When the plan is assembled". R3-09-docs-check.md:110 already expects the two to differ until then.
-->
