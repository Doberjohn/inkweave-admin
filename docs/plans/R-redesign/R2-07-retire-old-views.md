> Part of [R: Admin redesign](../R-redesign.md), phase R2 ([R2-calibration-tuning.md](R2-calibration-tuning.md)). Read the main plan's decisions (R-17 to R-26 for R2), corrections, global constraints and shared interfaces, then the R2 header, first.

## Re-base notes (R2-7)

The outline was written on 2026-10-01 against the planned R1 code. This version is checked against `main` @ `c92e260` (pin `bc877e1`), against the re-based R2 header as revised after its review, and against the re-based tasks R2-1 to R2-5a.

1. **The two "only if nothing imports them" files are settled.**
   - `RawVotesNotice.tsx` and its story go. `CalibrationView.tsx:11` is their only importer, and R2-6's workspace writes its own raw-votes `Notice`.
   - `activityStats.ts` and its test stay. `activity/activityModel.ts:4` and `overview/OverviewView.tsx:3` import it.
2. **The old `/calibration` host is R2-6's.** R2-6 deletes `src/tools/analytics/CalibrationPage.tsx` and its test. Here, Step 1 only checks that both are gone.
3. **Docs.**
   - `docs/PLAN.md` D10 is line 75, not 73. R1 already wrote "R2 redirects `/tuning` to `/calibration`" into it, so it gets no edit, only a check.
   - `CLAUDE.md:15-18` changes instead, as the header's task table says:
     - drop "`WeeklyActivityChart` … stays until R2", and keep "every new chart builds on it" (the Overview card's `GapScale` is drawn with divs, not the kit);
     - list `/calibration` as a writing page, with `/tuning` redirected;
     - name `UnsavedChangesGuard` (R2-5a's hand-off sentence).
   - `docs/tuning-editor-design.md:3` gains one sentence.
4. **Importers the outline missed.** The outline's grep ran only on paper. Run on the real tree, it finds two importers of `TuningPage` beyond the router:
   - `src/tools/__tests__/writePages.test.tsx:7` and its "Engine tuning" row (`:24`). This task drops the row (Step 3).
   - `src/shell/AdminShell.test.tsx:4`. This file is R2-6's, by the header's re-base note 9 and its R2-6 row.
     - Dropping the tuning nav item makes `isWritePath('/tuning')` false. The sidebar's token box then no longer shows on that route, so the test fails at R2-6's commit (reproduced in the sandbox).
     - R2-6 mounts `ImagePage` at `/image` instead. Step 1 stops if the file still imports `TuningPage`.
5. **Comments that speak of a retired file as live get reworded (Step 5).** That is R1-11's rule: past-tense provenance ("moved from …") may stay, and a live reference may not.
   - `verdict.ts:20-21` names `VerdictHero` as a reader.
     - It also points at "the SlightLean story", which is `VerdictHero.stories.tsx:15` and goes with it.
     - As the header's R2-7 row says, the pointer is dropped, not moved to another story. The Overview's `FullData` story shows the same −0.30 lean only while `overviewFixtures.ts` keeps that `meanGap`.
   - `overview/CalibrationCard.tsx:62` ("VerdictHero's logic"). Its new wording departs from the header's (note 11).
   - `overview/WeeklyCard.tsx:119` ("RawVotesNotice's copy").
   - `src/ui/Primitives.stories.tsx:196` ("WebAnalyticsView's stories", note 9).
   - R2-3's `RulesTable.tsx` doc comment ("It replaces RuleCalibrationTable", `R2-3.md:434`).
6. **New: `VerdictHero.test.tsx`'s render check is ported to `CalibrationCard`.**
   - The card draws the only gap scale left, and no test checks its scale mark.
     - `OverviewView.test.tsx:43-51` renders the card, but it checks only the verdict, the mean gap and the link.
     - `verdict.test.ts` tests `scalePercent` only as a function.
   - The port also pins the mark's position (−0.3 → `left: 40%`).
7. **The sidebar stories are R2-6's.** After R2-6, `/calibration` writes, and two `Sidebar.stories.tsx` lines go stale:
   - The decorator's default route (`:15`) no longer fits the `Open` story ("A read-only page").
   - `Collapsed` (`:38`) still opens `/tuning`, which leaves the nav.

   Neither fails a test. The header's re-base note 9 and its R2-6 row still give both lines to R2-6: `:15` moves to `/activity`, and `:38` to `/calibration`. Here, Step 6 only checks that no quoted `/tuning` path is left.
8. **The bridge.** One re-export loses its last importer, and the rest keep theirs:
   - `CAP_LABEL_XS` loses its last importers. R2-4's `VoteDetailTable` no longer imports it, and `RuleCalibrationTable` and `VerdictHero` go here. Step 7 drops it from `src/app-bridge.ts`.
   - `LinkButton`, `CtaButton`, `useContainerWidth` and `LETTER_SPACING` all have other users.

   Step 7 checks, as R1-12 did. Grepping every bridge name with R2's deletions and rewrites left out finds only `CAP_LABEL_XS` unused.
9. **R1's deferred items.**
   - **R1-7:** the `MemoryRouter` wrapper in the `TuningPage` tests retires with `TuningPage.test.tsx`. `writePages.test.tsx` keeps its wrapper. Its comment gives the reason ("Every page renders under the router in the app"), and R2-5a warns that a page with a token needs a data router anyway.
   - **R1-11:** `src/ui/Primitives.stories.tsx:196` still names the deleted `WebAnalyticsView` ("the sample trend WebAnalyticsView's stories used").
     - The header's R2-7 row and its "Deferred from R1" list give this rewording to R2-7. Step 5 takes it: "A deterministic sawtooth, so every Sparkline story draws the same sample trend."
     - `src/ui/Sparkline.tsx:18` ("moved from WebAnalyticsView") stays, as past-tense provenance.
10. **Verified in scratch sandboxes.**
    - **The first draft** was checked in `scratchpad/r2-rebase/sandbox-r2-7`. It held `src/` at `c92e260` through `git archive`, with every `node_modules` entry and `upstream/` linked read-only, and Vite and tsc caches kept in the sandbox.
      - **The baseline:** 80 files, 693 tests, all green.
      - **R2-6, simulated as far as R2-7 depends on it:**
        - the old `CalibrationPage` and its test deleted;
        - a stand-in `calibration/CalibrationPage.tsx` (token gate in an aside, `useLiveTuning` behind it);
        - the `/tuning` redirect;
        - `nav.ts` with calibration writing and the tuning item gone.
      - **What the simulation broke:** 15 tests in 4 files: eight in `router.test.tsx`, three in `nav.test.ts`, three in `Sidebar.test.tsx` and one in `AdminShell.test.tsx`. All four files are R2-6's by the header's re-base note 9 and its R2-6 row, which give their replacements.
      - **Before this task**, with R2-6 simulated, `src` held 79 files and 683 tests.
      - **Mutations.** Each failed the new `CalibrationCard` test: always drawing the dot, and drawing it at half the offset.
    - **This revision** was checked in `sandbox-fix-r27`, a copy of the first sandbox. `AdminShell.test.tsx` there is the header's R2-6 version (`ImagePage` at `/image`).
      - **Blocks:** every Before block here matches its file exactly once: the repo's, or R2-3's draft for `RulesTable.tsx`. The sandbox holds every After block except `RulesTable.tsx`'s, since R2-3 hasn't written that file.
      - **Gates:** after Steps 2 to 6, `tsc -b` exits 0, `eslint src .storybook` is clean, and `vite build` succeeds.
      - **Tests:** Vitest on `src` gives 74 files and 667 tests. That is 5 files and 16 tests fewer than before the task, as Step 9 expects.
        - The only failures are 14 in `router.test.tsx` (8), `nav.test.ts` (3) and `Sidebar.test.tsx` (3). Their replacements are R2-6's, and the sandbox doesn't apply them. This task adds no failure.
        - `CalibrationCard`, `writePages`, `AdminShell` and `OverviewView` pass on their own: 21 tests.
      - **Sweeps:** Step 4's import check prints nothing. Step 5's sweep prints only `WeeklyCard.tsx:119`, `CalibrationCard.test.tsx:6` and `Sparkline.tsx:18` (the sandbox has no R2-3 `RulesTable.tsx`).
    - **Commands.**
      - Every edited or new code file passes `pnpm exec eslint --stdin` against the repo's config.
      - The grep, bridge and `/tuning` commands in Steps 1, 4, 5, 6 and 7 were run against the repo as it is today. Step 6's grep was also run against the header's R2-6 stand-ins for `nav.test.ts` and `router.test.tsx`.
      - Their output is quoted where it differs from the post-R2-6 expectation.
    - **The cross-task critic's pass** changed Steps 6 and 7.
      - **Step 6:** R2-6's `nav.test.ts` compares paths (`item.path === '/tuning'`, `R2-6.md:1517`), and R2-6's hand-off says the grep prints three lines (`R2-6.md:1956`). So Step 6 now expects three.
      - **Step 7:** the bridge-name check was run on today's repo with R2-7's deletions, R1's `CalibrationPage` and R2-4's rewritten files (`VoteDetailTable`, `PairList`, `DimensionParticipation`) left out. Only `CAP_LABEL_XS` lost every importer. R2-4's new `VoteDetailTable` imports only `{LETTER_SPACING, SPACING}` (`R2-4.md:707`), and no other R2 task file names `CAP_LABEL_XS`. The bridge with its line removed passes `pnpm exec eslint --max-warnings 0 --stdin`.
11. **Flag for the header: its R2-7 row on `CalibrationCard.tsx:62`.** The row says the comment "names `verdict.ts` alone". Step 5 writes "(verdictFor and biasCopy)" instead, because the card reads two modules:
    - the verdict comes from `verdict.ts` (`CalibrationCard.tsx:68`, `verdictFor(meanGap)`);
    - the read line comes from `biasCopy.ts` (`:69`, `biasCopy(meanGap)`).

    Naming `verdict.ts` alone would misname the read line. The header's row should be corrected to match.

### Task R2-7: Retire the old views

**Files:**
- **Delete** (24 files, one `git rm` in Step 4):
  - `src/tools/analytics/`:
    - `CalibrationView.tsx`, `VerdictHero.tsx`, `Scorecard.tsx`, `WeeklyActivityChart.tsx`, `RuleCalibrationTable.tsx` and `RawVotesNotice.tsx`, each with its `.stories.tsx`;
    - `__tests__/CalibrationView.test.tsx`, `__tests__/VerdictHero.test.tsx` and `__tests__/RuleCalibrationTable.test.tsx`.
  - `src/tools/tuning/`:
    - `TuningPage.tsx`;
    - `index.ts`, the barrel whose only export is `TuningEditor` and whose only importer is `TuningPage.tsx:6`;
    - `components/TuningEditor.tsx` and `components/RuleSelector.tsx`, each with its `.stories.tsx`;
    - `__tests__/TuningPage.test.tsx`, `__tests__/TuningEditor.test.tsx` and `__tests__/RuleSelector.test.tsx`.
- **Create:** `src/tools/analytics/overview/__tests__/CalibrationCard.test.tsx`.
- **Modify:**
  - `src/tools/__tests__/writePages.test.tsx` (`:7`, `:21-30`)
  - `src/tools/analytics/verdict.ts` (`:20-21`)
  - `src/tools/analytics/overview/CalibrationCard.tsx` (`:62`)
  - `src/tools/analytics/overview/WeeklyCard.tsx` (`:119`)
  - `src/tools/analytics/calibration/RulesTable.tsx` (its doc comment, as R2-3 wrote it)
  - `src/ui/Primitives.stories.tsx` (`:196`)
  - `CLAUDE.md` (`:15`, `:16`, `:18`)
  - `docs/tuning-editor-design.md` (`:3`)
  - `src/app-bridge.ts` (the `CAP_LABEL_XS,` line of the `shared/constants` re-export, `:17`)
- **Checked and kept:**
  - `activityStats.ts` and its test;
  - `biasCopy.ts` (`CalibrationCard`, the tuning aside) and `gapColor.ts`;
  - `PairList`, `VoteDetailTable` and `DimensionParticipation` (R2-6 mounts them), and `dimensionStats.ts`;
  - `tuning/components/{PendingTray,TierRow}` (the tuning aside);
  - `useTuningAdmin.ts`, `useLiveTuning.ts` and `githubClient.ts`;
  - `src/ui/Sparkline.tsx:18` ("moved from WebAnalyticsView": past-tense provenance);
  - `docs/PLAN.md` (D10 already names the redirect).
- **R2-6's, only checked here** (the header's re-base note 9): `src/shell/AdminShell.test.tsx` (Step 1) and `src/shell/Sidebar.stories.tsx` (Step 6).

**Where the retired tests' cases live now** (the old file, then the task that holds its cases):

| Retired test | Cases | Now in |
|---|---|---|
| `CalibrationView.test.tsx` | 4: scope to a rule and back; open on a rule; an unknown rule opens on all pairs; U+2212 | R2-6 `calibration/__tests__/CalibrationPage.test.tsx` ("Selecting", "Selection from the URL"); R2-1 `findRow` and `pairsHeading` |
| `VerdictHero.test.tsx` | 1: the scale mark, absent without data | this task's `CalibrationCard.test.tsx`; R1-8's `verdict.test.ts` for `scalePercent` |
| `RuleCalibrationTable.test.tsx` | 1: sort by gap, then votes | R2-3 `RulesTable.test.tsx` (ported) |
| `RuleSelector.test.tsx` | 2: lists the config's entries; selects and presses | R2-1 `buildCalibrationRows` (tuning-only rows); R2-3 `RulesTable.test.tsx` (select, `aria-pressed`) |
| `TuningEditor.test.tsx` | 4: values per rule; revert; publish success; publish failure | R2-5 `TuningAside.test.tsx` (ported) |
| `TuningPage.test.tsx` | 2: reads the live file from the target branch; read error | R2-6 `CalibrationPage.test.tsx` (ported) |
| `writePages.test.tsx` "Engine tuning" | 3: header, no Forget token, gate | R2-6 `CalibrationPage.test.tsx` (header, token); `router.test.tsx` `WRITE_PAGES` and `WRITE_PATHS` |

**Interfaces:**
- **Consumes:**
  - `CalibrationCard(props: {meanGap: number | null; accuracySentiment: number | null}): JSX.Element`, from `src/tools/analytics/overview/CalibrationCard.tsx` (R1-8). It renders `PanelLink`, a react-router `Link`, so its test needs a router.
  - `scalePercent(meanGap: number | null): number | null` (`verdict.ts`, R1-8): `scalePercent(-0.3)` is `40`.
  - `calibrationSubtitle(global: GlobalStats | null): string` (R2-1). Only a comment names it.
- **Produces:** nothing new.
  - **Gone:** `CalibrationView`, `VerdictHero`, `Scorecard`, `ScorecardRow`, `ScorecardProps`, `WeeklyActivityChart`, `RuleCalibrationTable`, `RawVotesNotice`, `TuningPage`, `TuningEditor`, `RuleSelector` and the `src/tools/tuning` barrel, and the bridge's `CAP_LABEL_XS` re-export.
  - **The main plan:** its R1-11 contract line (`CalibrationViewProps gains: initialRuleId`) and its "File structure (R1)" row for `src/tools/analytics/CalibrationPage.tsx` describe retired code. R2's as-built note should strike them.

This task deletes code, so its red step is the import check in Step 1. It lists the importers still to move. The one new test is a port, which passes against code that already works.

- [ ] **Step 1: Check what R2-1 to R2-6 left**

The retired tests' cases must already live in their new homes. R2-5a's guard must exist too, because Step 8's `CLAUDE.md` sentence names it:

```bash
ls src/tools/analytics/calibration/__tests__/calibrationModel.test.ts \
  src/tools/analytics/calibration/__tests__/RulesTable.test.tsx \
  src/tools/analytics/calibration/__tests__/TuningAside.test.tsx \
  src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx \
  src/tools/analytics/calibration/CalibrationPage.tsx \
  src/tools/tuning/tuningRows.ts \
  src/shell/UnsavedChangesGuard.tsx
test ! -e src/tools/analytics/CalibrationPage.tsx && echo "R1's CalibrationPage is gone"
test ! -e src/tools/analytics/__tests__/CalibrationPage.test.tsx && echo "R1's CalibrationPage test is gone"
```

Expected: the seven paths, then `R1's CalibrationPage is gone` and `R1's CalibrationPage test is gone`.
- A "No such file" means the task that owns that file hasn't landed. Stop.
- A missing "is gone" line means R2-6 hasn't deleted R1's page or its test. Stop.

Then list what still imports a retired module, leaving out the files this task deletes:

```bash
RETIRED=(src/tools/analytics/{CalibrationView,VerdictHero,Scorecard,WeeklyActivityChart,RuleCalibrationTable,RawVotesNotice}{.tsx,.stories.tsx} src/tools/analytics/__tests__/{CalibrationView,VerdictHero,RuleCalibrationTable}.test.tsx src/tools/tuning/{TuningPage.tsx,index.ts} src/tools/tuning/components/{TuningEditor,RuleSelector}{.tsx,.stories.tsx} src/tools/tuning/__tests__/{TuningPage,TuningEditor,RuleSelector}.test.tsx)
echo "${#RETIRED[@]} retired files"
git grep -n -E "from '[^']*/(CalibrationView|VerdictHero|Scorecard|WeeklyActivityChart|RuleCalibrationTable|RawVotesNotice|RuleSelector|TuningEditor|TuningPage|tuning|tuning/index)'" -- src .storybook "${RETIRED[@]/#/:!}"
git grep -n "from './index'" -- src/tools/tuning "${RETIRED[@]/#/:!}"
```

Expected: `24 retired files`, then exactly one line:
```
src/tools/__tests__/writePages.test.tsx:7:import {TuningPage} from '../tuning/TuningPage';
```
- **If `src/shell/AdminShell.test.tsx:4` is listed,** R2-6 hasn't applied header re-base note 9 (`ImagePage` at `/image`). Stop.
- **Any other line means a task still renders an old view.** Stop and report it. On today's `main` (before R2-6) the check also lists `src/router.tsx:10` and `src/tools/analytics/CalibrationPage.tsx:5`, beside `AdminShell.test.tsx:4`. All three show that R2-6 hasn't landed.

The `-E` group's `tuning` and `tuning/index` catch an import of the barrel. Its other importer, `'./index'`, would sit inside `src/tools/tuning`; the second grep covers that.

- [ ] **Step 2: Port the scale-mark test to the Overview's calibration card**

`VerdictHero.test.tsx` is the only render test of a gap scale. The Overview's `CalibrationCard` draws the same scale from the same `scalePercent`, and no test checks its scale mark. (`OverviewView.test.tsx:43-51` renders the card, but it checks only the verdict, the mean gap and the link.) Create `src/tools/analytics/overview/__tests__/CalibrationCard.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CalibrationCard} from '../CalibrationCard';

// The scale's dot is the card's only round element. Ported from VerdictHero.test.tsx,
// which retired with the hero (R2-7): the card now draws the only gap scale.
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
});
```

Run: `pnpm vitest run src/tools/analytics/overview/__tests__/CalibrationCard.test.tsx`

Expected: PASS, `1 passed (1)`. A port pins behaviour that already works, so it starts green. While drafting, two mutations of `CalibrationCard.tsx`'s `GapScale` each failed it:
- **Always drawing the dot:** "expected … to have a length of +0 but got 1".
- **Drawing it at half the offset:** the `left: '40%'` assertion failed.

No other element in the card has `border-radius: 50%`. The centre tick's `left: '50%'` and the dot's `translateX(-50%)` don't match the selector.

- [ ] **Step 3: Take the write-page test off `TuningPage`**

In `src/tools/__tests__/writePages.test.tsx`, the imports (`:5-7`).

Before:
```tsx
import {ImagePage} from '../image/ImagePage';
import {RevealPage} from '../reveal/RevealPage';
import {TuningPage} from '../tuning/TuningPage';
```
After:
```tsx
import {ImagePage} from '../image/ImagePage';
import {RevealPage} from '../reveal/RevealPage';
```

The table and the fetch stub (`:21-30`). Before:
```tsx
const PAGES: Array<[title: string, Page: ComponentType, subtitle: string]> = [
  ['Reveal publisher', RevealPage, 'Add a newly revealed card to the preview set.'],
  ['Card images', ImagePage, "Replace an existing card's image."],
  ['Engine tuning', TuningPage, 'Edit playstyle copy and the Shift and Ramp scores.'],
];

beforeEach(() => {
  // With a token, the tuning page reads tuning.json. That read never settles here.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
});
```
After:
```tsx
// The pages whose whole body sits behind the token gate. /calibration writes
// too, but only its tuning aside is gated: its page tests and router.test.tsx's
// WRITE_PAGES cases cover it.
const PAGES: Array<[title: string, Page: ComponentType, subtitle: string]> = [
  ['Reveal publisher', RevealPage, 'Add a newly revealed card to the preview set.'],
  ['Card images', ImagePage, "Replace an existing card's image."],
];

beforeEach(() => {
  // Neither page fetches on mount. A fetch that slips through stays pending
  // instead of reaching the network.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
});
```

- **Why the stub stays:** nothing in `src/tools/{reveal,image}` or `src/github` fetches on mount, and neither do the bridged panels they render. Vitest's jsdom keeps Node's real `fetch`, though, so the stub is what keeps a stray call off the network.
- **Why `/calibration` isn't added to the table:** its gate is an aside under a page that renders without a token. R2-6's tests cover it instead:
  - its page tests check the header and the token;
  - `router.test.tsx`'s `WRITE_PAGES` holds `['/calibration', 'Calibration & tuning']`, for the gate under the title, the sidebar's "Forget token" and the one `main` landmark;
  - its `WRITE_PATHS` case checks the branch notice.
- **If the Before blocks don't match** (an earlier task touched the file), make the same two changes to what is there.

Run: `pnpm vitest run src/tools/__tests__/writePages.test.tsx`

Expected: PASS, `6 passed (6)`: three cases for each of the two pages.

- [ ] **Step 4: Delete the retired files**

```bash
git rm src/tools/analytics/{CalibrationView,VerdictHero,Scorecard,WeeklyActivityChart,RuleCalibrationTable,RawVotesNotice}{.tsx,.stories.tsx} src/tools/analytics/__tests__/{CalibrationView,VerdictHero,RuleCalibrationTable}.test.tsx src/tools/tuning/{TuningPage.tsx,index.ts} src/tools/tuning/components/{TuningEditor,RuleSelector}{.tsx,.stories.tsx} src/tools/tuning/__tests__/{TuningPage,TuningEditor,RuleSelector}.test.tsx
```

Expected: 24 `rm '…'` lines.

Then run the import check with nothing left out:

```bash
git grep -n -E "from '[^']*/(CalibrationView|VerdictHero|Scorecard|WeeklyActivityChart|RuleCalibrationTable|RawVotesNotice|RuleSelector|TuningEditor|TuningPage|tuning|tuning/index)'" -- src .storybook
git grep -n "from './index'" -- src/tools/tuning
```

Expected: no output from either. Stories are under `src`, so the check covers them too, and `tsc -b` compiles them in Step 9.

- [ ] **Step 5: Reword the comments that speak of a retired file as live**

R1-11's rule applies here: a comment may record where code came from, in the past tense, but it may not describe a retired file as if it still exists.

`src/tools/analytics/verdict.ts` (`:20-21`).
- The SlightLean story was `VerdictHero.stories.tsx:15`, and it goes with the hero. The comment drops the pointer rather than naming another story. The Overview's `FullData` story shows the same lean only while `overviewFixtures.ts` keeps `meanGap: -0.3`.
- `calibrationSubtitle` is R2-1's reader (`calibrationModel.ts`: `verdictFor(global.meanGap).word`).

Before:
```ts
 * reads "well-calibrated" with the lean noted underneath (the SlightLean story).
 * VerdictHero and the Overview's calibration card both read it.
```
After:
```ts
 * reads "well-calibrated" with the lean noted underneath. The Overview's
 * calibration card and the calibration page's subtitle (calibrationSubtitle)
 * both read it.
```

`src/tools/analytics/overview/CalibrationCard.tsx` (`:62`). The card's verdict comes from `verdictFor` (`:68`) and its read line from `biasCopy` (`:69`), so the comment names both. The header's R2-7 row says `verdict.ts` alone; re-base note 11 flags that. Before:
```tsx
 * (VerdictHero's logic, shared through verdict.ts), the mean gap as the hero
```
After:
```tsx
 * (verdictFor and biasCopy), the mean gap as the hero
```

`src/tools/analytics/overview/WeeklyCard.tsx` (`:119`). Before:
```tsx
 * them (RawVotesNotice's copy, minus the panels that now live on Calibration).
```
After:
```tsx
 * them (the copy RawVotesNotice used, minus the panels that now live on Calibration).
```

`src/tools/analytics/calibration/RulesTable.tsx`, the doc comment above `RulesTable`, as R2-3 wrote it (`R2-3.md:432-434`). Before:
```tsx
 * |gap| or by votes (sortCalibrationRows, so tuning-only rows stay last). It
 * replaces RuleCalibrationTable. Rows keep <table> semantics for the columns
```
After:
```tsx
 * |gap| or by votes (sortCalibrationRows, so tuning-only rows stay last). It
 * replaced RuleCalibrationTable. Rows keep <table> semantics for the columns
```
If R2-3's comment reads differently, apply the same rule to it.

`src/ui/Primitives.stories.tsx` (`:196`), R1-11's deferred item. `WebAnalyticsView` was deleted in R1. Before:
```tsx
/** A deterministic sawtooth: the sample trend WebAnalyticsView's stories used. */
```
After:
```tsx
/** A deterministic sawtooth, so every Sparkline story draws the same sample trend. */
```
`src/ui/Sparkline.tsx:18` ("moved from WebAnalyticsView") stays: it is past-tense provenance.

Then sweep for the names:

```bash
git grep -n -w -E "CalibrationView|VerdictHero|Scorecard|ScorecardRow|WeeklyActivityChart|RuleCalibrationTable|RawVotesNotice|RuleSelector|TuningEditor|TuningPage|WebAnalyticsView" -- src .storybook
```

Expected: only past-tense provenance. Each of these may stay:
- `src/tools/analytics/overview/WeeklyCard.tsx:119` (the copy RawVotesNotice used);
- `src/tools/analytics/overview/__tests__/CalibrationCard.test.tsx:6` (ported from VerdictHero.test.tsx);
- `src/tools/analytics/calibration/RulesTable.tsx` (replaced RuleCalibrationTable);
- `src/ui/Sparkline.tsx:18` (moved from WebAnalyticsView);
- any "copied from" or "ported from" note that R2-1 to R2-6 left, such as R2-5's `EditableRow` copy or R2-6's ported page tests.

Reword any line that speaks of a retired file in the present tense, as above.

Before R2-6 (today's tree, with Steps 3 and 4 done), the sweep also prints these lines:
- **`src/router.tsx:10` and `:25`, and `src/shell/AdminShell.test.tsx:4` and `:8`.** Any line in those two files means R2-6 hasn't landed. Stop.
- **R1's `src/tools/analytics/CalibrationPage.tsx`**, which R2-6 deletes.
- **`verdict.ts:21`, `CalibrationCard.tsx:62` and `Primitives.stories.tsx:196`**, if the sweep runs before this step's edits.

- [ ] **Step 6: Check that no quoted `/tuning` path is left**

R2-6 moves R1's tests and stories off `/tuning` (header re-base note 9). That includes `Sidebar.stories.tsx`: its decorator's default route (`:15`) moves to `/activity`, and `Collapsed` (`:38`) to `/calibration`. This step edits nothing. It only checks:

```bash
git grep -n -E "['\"\`]/tuning['\"\`?]" -- src .storybook
```

Expected: exactly three lines, all R2-6's:
- `src/shell/nav.test.ts`'s `it.each(['/tuning', '/no-such-page'])`: a redirect path writes nothing;
- `src/shell/nav.test.ts`'s `NAV_ITEMS.some((item) => item.id === 'tuning' || item.path === '/tuning')`: no nav item is left for `/tuning`;
- `src/router.test.tsx`'s new redirect case, where `/tuning` lands on `/calibration`.

What doesn't match:
- `src/router.tsx`'s redirect is `{path: 'tuning', …}`, with no slash.
- `src/tools/tuning/githubClient.ts:9` (`…/data/tuning.json`) has no quote right before `/tuning`.

Any other line is a leftover:
- **In a file the header's R2-6 row lists**, it means R2-6 hasn't landed. Stop.
- **Anywhere else**, point it at `/calibration`.

Today (before R2-6) the command prints nine lines instead: `nav.ts:26`, `nav.test.ts:18`, `Sidebar.test.tsx:33` and `:81`, `Sidebar.stories.tsx:38`, `AdminShell.test.tsx:25`, and `router.test.tsx:44`, `:56` and `:105`.

- [ ] **Step 7: Drop the bridge re-export that lost its last importer**

R1-12 dropped re-exports nothing used, and the owner approved that rule (2026-10-02).

```bash
node -e "const s=require('fs').readFileSync('src/app-bridge.ts','utf8');for(const m of s.matchAll(/export\s*\{([^}]*)\}/g))for(const p of m[1].split(','))if(p.trim())console.log(p.trim().split(/\s+as\s+/).pop())" | while read -r name; do git grep -qw "$name" -- src .storybook scripts ':!src/app-bridge.ts' || echo "unused: $name"; done
```

Expected: exactly one line:
```
unused: CAP_LABEL_XS
```
- **Why:** R2-4's `VoteDetailTable` imports only `{LETTER_SPACING, SPACING}` from the bridge, and Step 4 deleted `RuleCalibrationTable.tsx` and `VerdictHero.tsx`, its other two importers.
- **What it covers:** `LinkButton` and `CtaButton` keep the kit's other users, and `useContainerWidth` keeps the charts.
- **If any other name prints,** an R2 task dropped its last other user. Remove that name from its `export {…}` list in `src/app-bridge.ts` too, and say so at review.
- **If nothing prints,** a file still imports `CAP_LABEL_XS`, and `git grep -nw CAP_LABEL_XS -- src ':!src/app-bridge.ts'` names it. If that is `VoteDetailTable.tsx`, R2-4 hasn't landed. Stop, and leave the bridge as it is.
- **Today** (before R2-4 and this task) the check prints nothing: `VoteDetailTable`, `RuleCalibrationTable` and `VerdictHero` all still import `CAP_LABEL_XS`.

Then edit the bridge. In `src/app-bridge.ts`, the `shared/constants` re-export (`:16-18`). Before:
```ts
  ALL_INKS,
  CAP_LABEL_XS,
  COLORS,
```
After:
```ts
  ALL_INKS,
  COLORS,
```

Re-run the check. Expected: no output.

- [ ] **Step 8: Docs**

`CLAUDE.md`, "The tools", line 15. Before:
```markdown
The kit is hand-built SVG on the admin theme, with no chart library, and every new chart builds on it. `/calibration`'s `WeeklyActivityChart` predates it and stays until R2 replaces it, and `Sparkline`, `MeterBar` and `BiasBar` stay `src/ui` primitives.
```
After:
```markdown
The kit is hand-built SVG on the admin theme, with no chart library, and every new chart builds on it. `Sparkline`, `MeterBar` and `BiasBar` stay `src/ui` primitives.
```
"Every new chart" stays: the Overview card's `GapScale` is drawn with divs, not the kit, so "every chart" would be untrue.

Line 16. Before:
```markdown
- Routes: the Overview at `/`, the insights pages `/calibration`, `/activity` and `/web`, and the write tools `/reveal`, `/image` and `/tuning`. `src/shell/nav.ts` lists the sidebar's items and marks the ones that write (`writes`). `src/router.tsx` also redirects retired paths: `/analytics` goes to `/`.
```
After:
```markdown
- Routes: the Overview at `/`, the insights pages `/calibration`, `/activity` and `/web`, and the write tools `/reveal` and `/image`. `/calibration` writes too: its aside is the tuning editor. `src/shell/nav.ts` lists the sidebar's items and marks the ones that write (`writes`). `src/router.tsx` also redirects retired paths: `/analytics` goes to `/`, and `/tuning` to `/calibration`.
```
The rest of line 16 ("The insights pages read `/admin-data/` …") is unchanged.

Line 18. Before:
```markdown
- Write pages sit behind `GithubTokenGate`. `useGithubToken` is one store shared by every component, so the sidebar's token box (on write pages, once a token is saved) and its "Forget token" act on every page at once.
```
After:
```markdown
- Write pages sit behind `GithubTokenGate`; on `/calibration` only the tuning aside does, so the analytics need no token. `useGithubToken` is one store shared by every component, so the sidebar's token box (on write pages, once a token is saved) and its "Forget token" act on every page at once. A page that holds unsaved edits mounts one `UnsavedChangesGuard` (`src/shell/`), which asks before leaving it. The guard needs the data router, so tests render that page with `createMemoryRouter`, never the `MemoryRouter` wrapper.
```

Line 17 stays. "The reveal, image and tuning tools commit to …" still holds, and so does "Every page that writes names the branch in its header".

`docs/tuning-editor-design.md`, line 3, the end of the "Moved from the app repo" note. Before:
```markdown
where this design says `master`, read the target branch.
```
After:
```markdown
where this design says `master`, read the target branch. Since the redesign's phase R2 (#24), the editor is the aside of `/calibration`, beside the calibration analytics it tunes, and `/tuning` redirects there.
```

`docs/PLAN.md` needs no edit. Check:

```bash
git grep -n 'R2 redirects `/tuning` to `/calibration`' -- docs/PLAN.md
git grep -n -w -E "CalibrationView|VerdictHero|Scorecard|WeeklyActivityChart|RuleCalibrationTable|RawVotesNotice|RuleSelector|TuningEditor|TuningPage" -- CLAUDE.md README.md docs .claude ':!docs/plans'
```

Expected:
- **The first command** prints `docs/PLAN.md:75:| D10 | URLs | …`.
- **The second** prints nothing. Before the CLAUDE.md edit it printed `CLAUDE.md:15` (`WeeklyActivityChart`).
- **`docs/plans/`** stays as written: the plans are a record.

- [ ] **Step 9: Run the gates**

Run `pnpm lint`, `pnpm typecheck`, `pnpm test:run` and `pnpm build`.

Expected: all four finish with no errors, and Vitest reports no failed test.
- **Counts:** against a `pnpm test:run` just before Step 2, the suite has 5 fewer test files (6 deleted, 1 added) and 16 fewer tests.
  - 14 tests go with the deleted files: `CalibrationView` 4, `VerdictHero` 1, `RuleCalibrationTable` 1, `TuningPage` 2, `TuningEditor` 4, `RuleSelector` 2.
  - `writePages` loses 3, and `CalibrationCard` adds 1.
  - These counts hold if R2-2 to R2-6 left those files' cases as planned.
- **A `Cannot find module`** from `typecheck` names an importer that Step 1 missed. Point it at the R2 replacement.
- **If Vitest fails to start its workers under load,** stop this session's preview servers, wait out other sessions' runs, and retry.

- [ ] **Step 10: Commit**

After the owner approves, with the Bash tool. Step 4's `git rm` already staged the 24 deletions.

```bash
git add src/tools/analytics/overview/__tests__/CalibrationCard.test.tsx src/tools/__tests__/writePages.test.tsx src/tools/analytics/verdict.ts src/tools/analytics/overview/CalibrationCard.tsx src/tools/analytics/overview/WeeklyCard.tsx src/tools/analytics/calibration/RulesTable.tsx src/ui/Primitives.stories.tsx src/app-bridge.ts CLAUDE.md docs/tuning-editor-design.md
USER_APPROVED=1 git commit -m "refactor(analytics): retire the old calibration and tuning views (#24)"
```

Never pipe the commit. The pre-commit hook runs lint and the tests.

<!--
Review notes (2026-10-05), as applied. Each was checked against main @ c92e260 and the revised header (scratchpad/r2-rebase/header.md); none was rejected.
- Note 1 (blocking): Step 4 deleted and later steps renumbered (old 5-11 are now 4-10, cross-references updated). AdminShell.test.tsx removed from Files, Interfaces and the commit step; the "Hand-off to R2-6" section deleted. Its Sidebar.test.tsx:81 target ('/calibration') contradicted the header's '/reveal'. Step 1's bullet replaced as given. Its "today" bullet also names AdminShell.test.tsx:4, which today's check prints. Re-base notes 4 and 10 reworded.
- Note 2: Sidebar.stories.tsx removed from Files and the git add; Step 6 is a check only. Its expectation was confirmed against the header's R2-6 stand-ins (sandbox-header-fix): the grep prints nav.test.ts:22 and router.test.tsx's redirect case only. Today's output re-run: nine lines, now all listed. Re-base note 7 rewritten.
- Note 3: Primitives.stories.tsx:196 reworded in Step 5 (Before matches the repo exactly); added to Files and the git add; WebAnalyticsView added to the sweep, with Sparkline.tsx:18 on the may-stay list. No doc outside docs/plans names WebAnalyticsView, so Step 8's docs grep is unchanged.
- Note 4: verdict.ts After block as given. Re-base note 5 and Step 5's lead-in now say the story pointer is dropped, not moved.
- Note 5: kept "(verdictFor and biasCopy)"; new re-base note 11 flags the header row (CalibrationCard.tsx:68 verdictFor, :69 biasCopy).
- Note 6: confirmed (OverviewView.test.tsx:43-51 renders the card); re-base note 6 and Step 2 reworded.
- Note 7: CLAUDE.md line 15 After block as given. GapScale is divs (CalibrationCard.tsx:24-52); re-base note 3 and Step 8 say why "new" stays.
- Note 8: Step 1 checks src/shell/UnsavedChangesGuard.tsx (R2-5a's file) and R1's CalibrationPage test (it exists today).
- Note 9: confirmed by running the extended sweep on today's tree minus the retired files; Step 5's list completed.
- Note 10: the table row and Step 3's comment as given (header :26, WRITE_PAGES). The "Why /calibration isn't added" bullet was updated to match.
- Re-verified in sandbox-fix-r27 (see re-base note 10). Every changed block passes `pnpm exec eslint --stdin` in the repo.
- Cross-task critic (2026-10-05), items 2 and 3, both applied. Item 2: CAP_LABEL_XS loses its last importers (R2-4's VoteDetailTable, plus this task's deletions); Step 7 now expects `unused: CAP_LABEL_XS`, drops it from src/app-bridge.ts, and re-runs; Files, Produces, note 8 and the git add updated. Item 3: Step 6 expects three lines (R2-6 compares paths); the "third expected one" bullet deleted. Note 2's "nav.test.ts:22 and router.test.tsx's redirect case only" above was against the header's earlier stand-ins.
-->
