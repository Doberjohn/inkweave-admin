> Part of [R: Admin redesign](../R-redesign.md), phase R2 ([R2-calibration-tuning.md](R2-calibration-tuning.md)). Read the main plan's decisions (R-17 to R-26 for R2), corrections, global constraints and shared interfaces, then the R2 header, first.

> **Re-base notes (R2-8, 2026-10-05).** This task is new. The outline had no R2-8: decision R-22 adds it. It is written against main @ `c92e260` (branch `feature/24-redesign-r2`), pin `upstream/inkweave` @ `bc877e1`, and the R2-1, R2-7 and header drafts in this folder (R2-1 as revised: the section always comes from the artifact's `category`).
> - **What changes.** The Overview's "Rules to review" link reads "Tune" for a rule with a `tuning.json` copy and "Inspect" for one without (R-22). Both go to `calibrationHref(r.ruleId)`. The outline's contract addition 2 called moving this link onto `calibrationHref` optional; this task does it.
> - **How the Overview knows, without a token.**
>   - The Overview loads no `tuning.json`, and it can't fetch one without a token: the app repo is private (since 2026-10-01), and `tuning.json` isn't among the paths forwarded to inkweave.ink. The only token-free copy is the one the pinned engine bundles.
>   - So the card asks R2-1's `tuningKeyFor(rule, TUNING)`. That function takes the `tuning.json` section from the artifact's `category`. A playstyle rule's key is the artifact's `playstyleId` (R-17), and only when the artifact lacks that field does it fall back to the pinned engine's `getRuleById` for a playstyle rule; a direct rule is keyed by its own id in `directRules`. `TUNING` is the engine's bundled `tuning.json`.
>   - **Engine facts checked at `bc877e1`:**
>     - `TUNING` and `TuningConfig` are exported at `packages/synergy-engine/src/index.ts:144`, from `data/tuning.ts:17` (`export const TUNING = raw as TuningConfig`, where `raw` is `tuning.json`).
>     - The package is `inkweave-synergy-engine`, a pnpm workspace package (`pnpm-workspace.yaml:2`, `package.json:26`). Admin imports it by name, as `src/tools/reveal/validateForm.ts:1` does. It is not app code, so it doesn't go through `src/app-bridge.ts`. At `c92e260`, `src/tools/tuning/components/TuningEditor.stories.tsx:2` imports `TUNING` from it too (R2-7 deletes that story).
>     - Run in node against the built engine, the mapping gives:
>       - an entry for `discard`, `ramp`, `shift-targets`, `lore-loss` (under `lore-denial`) and `location-boost` (under `location-control`);
>       - no entry for six rules: `named-companions`, `singer-songs`, `spike-suit`, `merida-archer`, `merida-wisp` and `free-play`.
>     - `directRules` holds one key, `shift-targets`; `playstyles` holds 22.
>   - **No bundle cost.** `TUNING` is already in the one chunk:
>     - the engine's `rules.ts:91`, `playstyles.ts:2` and `ruleScoring.ts:32` import it;
>     - `useRevealAdmin.ts` imports `synergyEngine` at runtime;
>     - `router.tsx` imports every page eagerly.
>   - **The lag, and why it's harmless.** A key the app adds on `master` after the pin reads "Inspect" until the next pin bump (Dependabot, weekly), but the page it opens reads the live file and shows the entry. A key removed after the pin reads "Tune" until the bump, and the aside then says "No copy in tuning.json" (R-20). A rehearsal branch's `tuning.json` can differ in the same way. Either way the link still opens the same page.
> - **Where the check lives.**
>   - It is a private `RuleLink` component inside `RulesToReviewCard.tsx`. `react-refresh/only-export-components` allows a component that isn't exported.
>   - It can't go in `overviewStats.ts`. R2-1's `calibrationModel.ts` imports `MIN_RULE_VOTES` from there, so the reverse import would make a cycle. Its `export const LOW_N = MIN_RULE_VOTES` would then throw at load (temporal dead zone) whenever `overviewStats.ts` loads first.
> - **The link carries the rule's own id, never its tuning key.** R2-1's `findRow` matches a row id first. So `?rule=location-boost` opens that rule's row, while `?rule=location-control` would open the first location rule, which may not be the one listed.
> - **Layout fixes the outline couldn't see.**
>   - **The link column.** It is 36px today. It fits "Tune" (27.3px) but not "Inspect" (43.3px). Both are measured at 12px (`ADMIN_TYPE.small`) in the app's Plus Jakarta Sans 400, from the advance widths in `upstream/inkweave/apps/web/public/fonts/plus-jakarta-sans-400.woff2`, with no kerning. Under `whiteSpace: 'nowrap'`, a line too long for its box is start-aligned and overflows its end edge, whatever `text-align` says. So "Inspect" would run 7px past the list's edge into the panel's 20px padding, out of line with the "Tune" links.
>   - **The gap column has room to spare.** Every signed gap is 35.0px at 13px (`ADMIN_TYPE.body`) in the span's tabular figures: the sign 7.9px, three digits at 7.8px each and the point 3.7px, from the same file's `hmtx` and its `tnum` substitutions. Proportional digits would make it at most 40.1px.
>   - So both columns become 48px, and the bias bar's track gives the 8px. At the narrowest three-up card (280px, a 238px list), the track goes from 34px to 26px. It is back at its full 100px from a 354px card up (346px before).
>   - **The bar has to follow its track.** `BiasBar`'s root has `minWidth: 64` and `position: 'relative'` (`src/ui/BiasBar.tsx:35`), and it is a direct grid item. Its track, `minmax(0, 100px)`, has a fixed minimum, so grid sizing ignores the item's min-width: the track shrinks, the bar stays 64px and runs out of it to the right, and being positioned, it paints over the gap number.
>     - Today the overlap is about 1px, on 280px cards only.
>     - With 48px columns, it would cover the first 13px of the number, sign included, on cards narrower than about 293px. That is the three-up range at about 1185–1230px viewports with the sidebar open.
>     - So `BiasBar` gains `minWidth?: number`, default 64, so every other use keeps today's floor. The card passes 0. The bar then spans exactly its track: [92, 118] in a 238px list, 25px clear of the number at [143, 178].
>   - jsdom has no layout, so Step 9 measures the rows in Storybook.
> - **Accessible names.** They are "Tune {rule}" and "Inspect {rule}". Each starts with the visible word (WCAG 2.5.3, label in name).
> - **Also updated:**
>   - `PanelLink`'s two doc comments.
>   - A fixture comment on `singer-songs`, the Overview fixtures' one rule without a copy. The `FullData` and `NarrowCard` stories show "Inspect" through it.
>   - The one line of `OverviewView.test.tsx` that changes (`:69`).
> - **Not taken:**
>   - `CalibrationCard`'s "Open calibration →" keeps `to="/calibration"`, which is the same string `calibrationHref()` returns.
>   - The "→" in that link's accessible name stays as it is: an R1-8 deferred item, left to the owner.
>   - A template that needs no `src/ui` change, `minmax(58px, 1fr) minmax(48px, 100px) 48px 48px`. Names would drop to 58px on the narrowest card, and the bar would still overrun its track by 16px.
> - **Depends on, and when it runs:**
>   - R2-1: `tuningKeyFor`, and `RuleStat.playstyleId?`.
>   - R2-6: `calibrationHref`, contract addition 2.
>   - It runs last, after R2-7, as the header's task table orders it. The code needs only R2-1 and R2-6. But Step 7's grep expects R2-6 and R2-7 to have deleted the old views, and its test counts include R2-7's `CalibrationCard.test.tsx`. Step 1 checks all three.
> - **Verified in a scratch sandbox** (`scratchpad/r2-rebase/sandbox-fix-R2-8`).
>   - **Setup.** The sandbox held a copy of `src` plus junctions to the repo's `node_modules` and `upstream`. On top of that copy:
>     - R2-1's Step 10 `calibrationModel.ts` and Step 5 `RuleStat` field, from the revised R2-1;
>     - R2-6's `calibrationHref`, as the outline's R2-6 writes it (contract addition 2).
>   - **Results:**
>     - With today's card and `BiasBar`, the three test files gave `6 failed | 21 passed (27)`, the failures exactly as Step 4 lists them. With Step 5's code they gave `27 passed (27)`.
>     - The overview folder gave 5 files and 52 tests passed. With R2-7's `CalibrationCard.test.tsx` added, it gave 6 files and 53 tests, as Step 7 expects, and the overview folder plus `src/ui` gave 16 files and 116 tests. The whole `vitest run src` (without R2-7's test) gave 81 files and 699 tests passed.
>     - `tsc -p tsconfig.app.json` is clean.
>     - `pnpm exec eslint --stdin` is clean on all seven files.
>     - Step 7's grep, run on the sandbox after the `PanelLink` edit, finds only R1's `CalibrationPage.tsx` (two lines), `CalibrationView.tsx` and `CalibrationView.stories.tsx`. R2-6 and R2-7 delete all three.
>     - Step 9's snippet was run in jsdom against the rendered card, for its selectors only: four rows of four cells, and the JSX comment adds no node. jsdom has no layout, so its numbers need the browser.
> - **When the plan is assembled.**
>   - In the main plan's contract additions, the line `// URL contract: /calibration?rule=<RuleStat.ruleId> (R1-8 writes it, R1-11 reads it)` gains `; R2-8 writes it through calibrationHref, R2-6 reads it`.
>   - The header's task table cites `OverviewView.test.tsx:66-71` for R2-8. The lines are `:65-70`.

### Task R2-8: The Overview's "Tune" or "Inspect" link (R-22)

**Files:**
- Modify `src/tools/analytics/overview/RulesToReviewCard.tsx`:
  - the imports and doc comment (`:1-16`);
  - the grid comment and template (`:34-35`);
  - the bias bar (`:45`);
  - the link (`:49-53`).
- Modify `src/ui/BiasBar.tsx`: the props (`:9-14`), and the signature and root style (`:30-35`).
- Modify `src/tools/analytics/overview/PanelLink.tsx`: the doc comments at `:7` and `:12`.
- Modify `src/tools/analytics/overview/overviewFixtures.ts`: a comment above `:19`, the `singer-songs` rule.
- Test, create: `src/tools/analytics/overview/__tests__/RulesToReviewCard.test.tsx`.
- Test, modify: `src/tools/analytics/overview/__tests__/OverviewView.test.tsx:65-70`.
- Test, modify: `src/ui/__tests__/BiasBar.test.tsx`: one case at the end (`:42-46`).

**Interfaces:**
- **Consumes:**
  - From `src/tools/analytics/calibration/calibrationModel.ts` (R2-1):
    ```ts
    export function tuningKeyFor(rule: Pick<RuleStat, 'ruleId' | 'category' | 'playstyleId'>, config: TuningConfig): string | null;
    // section: the artifact's category; a playstyle rule's key: its playstyleId, else the pinned engine's; a direct rule's: its own id
    ```
  - `RuleStat.playstyleId?: string | null` (R2-1, `src/tools/analytics/voteAnalyticsTypes.ts`).
  - `TUNING: TuningConfig` from `inkweave-synergy-engine`, the pinned engine's bundled `tuning.json` (`index.ts:144`).
  - From `src/shell/nav.ts` (R2-6, contract addition 2):
    ```ts
    export function calibrationHref(ruleId?: string): string; // '/calibration?rule=' + encodeURIComponent(ruleId), or '/calibration'
    ```
  - `PanelLink({to, label, children})` (R1-8, `src/tools/analytics/overview/PanelLink.tsx`).
- **Produces:**
  - `BiasBar` takes one more optional prop. Every existing call keeps today's 64px floor:
    ```ts
    // src/ui/BiasBar.tsx
    interface BiasBarProps {gap: number | null; scale?: number; minWidth?: number} // minWidth: the root's min-width in px, default 64
    export function BiasBar({gap, scale, minWidth}: BiasBarProps): JSX.Element;
    ```
  - No new export from the card. `RulesToReviewCard({rules}: {rules: RuleStat[]})` keeps its props.
  - Each listed rule's link:
    - visible text `'Tune' | 'Inspect'`, "Tune" when `tuningKeyFor(rule, TUNING) != null`;
    - `aria-label` `` `${verb} ${rule.ruleName}` ``;
    - `href` `calibrationHref(rule.ruleId)`.
  - Each row's bias bar takes `minWidth={0}`, so it spans exactly its grid track.

**What the link reads, rule by rule** (pin `bc877e1`):

| Rule | Artifact `category` | Artifact `playstyleId` | Key without it | Pinned `TUNING` entry | Link |
|---|---|---|---|---|---|
| `ramp`, `discard`, … | playstyle | their own id | the pinned engine's: their own id | yes | Tune |
| `lore-loss` | playstyle | `'lore-denial'` | the pinned engine's: `lore-denial` | yes | Tune |
| the nine `location-*` rules | playstyle | `'location-control'` | the pinned engine's: `location-control` | yes | Tune |
| `shift-targets` | direct | `null` | not asked: its own id | yes (`directRules`) | Tune |
| `named-companions`, `singer-songs`, `spike-suit`, `merida-archer`, `merida-wisp`, `free-play` | direct | `null` | not asked: its own id | no | Inspect |
| a rule on `master` the pin lacks | either | its playstyleId, or `null` | its own id | whatever the pinned file holds under that key | Tune or Inspect |

The section is always the artifact's `category`. Only a playstyle rule's key can come from the pinned engine, and only when the artifact lacks the `playstyleId` field: one written before R2, or a local snapshot of one.

- [ ] **Step 1: Check what this task builds on**

From the repo root:

```bash
grep -n "export function calibrationHref" src/shell/nav.ts
grep -n "export function tuningKeyFor" src/tools/analytics/calibration/calibrationModel.ts
grep -n "playstyleId?: string | null;" src/tools/analytics/voteAnalyticsTypes.ts
ls src/tools/analytics/CalibrationPage.tsx src/tools/analytics/CalibrationView.tsx
```

Expected: one line from each `grep`, and `No such file or directory` for both files `ls` names.
- If the first `grep` finds nothing, or `ls` lists `CalibrationPage.tsx`, R2-6 hasn't landed.
- If either of the other two finds nothing, R2-1 hasn't landed.
- If `ls` lists `CalibrationView.tsx`, R2-7 hasn't landed.

Stop in any of these cases: this task runs after all three.

- [ ] **Step 2: Write the failing tests**

Create `src/tools/analytics/overview/__tests__/RulesToReviewCard.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {RuleStat} from '../../voteAnalyticsTypes';
import {RulesToReviewCard} from '../RulesToReviewCard';

/**
 * A rule the card lists: 50 score votes and a gap. Give the gaps widest first
 * and the card keeps their order. No playstyleId unless `over` gives one: the
 * shape of an artifact written before R2, so the mapping asks the pinned engine
 * for a playstyle rule's key.
 */
function rule(ruleId: string, ruleName: string, meanGap: number, over: Partial<RuleStat> = {}): RuleStat {
  return {
    ruleId,
    ruleName,
    category: 'playstyle',
    scoreVotes: 50,
    pairsVoted: 25,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 0.4,
    ...over,
  };
}

// The links are router Links, so the card needs a router.
function renderCard(rules: RuleStat[]) {
  render(
    <MemoryRouter>
      <RulesToReviewCard rules={rules} />
    </MemoryRouter>,
  );
  return within(screen.getByRole('list', {name: 'Rules to review'}));
}

/** Each link as [visible text, accessible name]. */
function links(list: ReturnType<typeof renderCard>): Array<[string | null, string | null]> {
  return list.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('aria-label')]);
}

describe('RulesToReviewCard', () => {
  it('says Tune for a rule with a tuning.json copy and Inspect for one without (R-22)', () => {
    const list = renderCard([
      rule('ramp', 'Ramp', -0.9),
      rule('shift-targets', 'Shift Targets', 0.8, {category: 'direct'}),
      rule('singer-songs', 'Singer + Songs', 0.7, {category: 'direct'}),
    ]);
    expect(links(list)).toEqual([
      ['Tune', 'Tune Ramp'],
      ['Tune', 'Tune Shift Targets'],
      ['Inspect', 'Inspect Singer + Songs'],
    ]);
  });

  it('opens Calibration on the rule either way', () => {
    const list = renderCard([
      rule('ramp', 'Ramp', -0.9),
      rule('singer-songs', 'Singer + Songs', 0.7, {category: 'direct'}),
    ]);
    expect(list.getByRole('link', {name: 'Tune Ramp'})).toHaveAttribute('href', '/calibration?rule=ramp');
    expect(list.getByRole('link', {name: 'Inspect Singer + Songs'})).toHaveAttribute(
      'href',
      '/calibration?rule=singer-songs',
    );
  });

  it("finds a copy kept under another key through the pinned engine, and links the rule's own id", () => {
    // lore-loss keeps its copy under lore-denial, every location-* rule under location-control.
    const list = renderCard([rule('lore-loss', 'Lore Loss', 1.2), rule('location-boost', 'Location Boost', -1.1)]);
    expect(list.getByRole('link', {name: 'Tune Lore Loss'})).toHaveAttribute('href', '/calibration?rule=lore-loss');
    expect(list.getByRole('link', {name: 'Tune Location Boost'})).toHaveAttribute(
      'href',
      '/calibration?rule=location-boost',
    );
  });

  it("takes the artifact's playstyleId first (R-17), against the pinned tuning.json", () => {
    const list = renderCard([
      // On app master, not at the pin: the artifact still names its copy.
      rule('location-new-trigger', 'Location New Trigger', 1.5, {playstyleId: 'location-control'}),
      // A playstyle the pinned tuning.json lacks reads Inspect until the pin bump.
      rule('brand-new', 'Brand New', -1.4, {playstyleId: 'brand-new-playstyle'}),
      // A direct rule with no entry, under its own id.
      rule('brand-new-direct', 'Brand New Direct', 1.3, {category: 'direct', playstyleId: null}),
    ]);
    expect(links(list)).toEqual([
      ['Tune', 'Tune Location New Trigger'],
      ['Inspect', 'Inspect Brand New'],
      ['Inspect', 'Inspect Brand New Direct'],
    ]);
  });

  it('escapes the rule id in the link', () => {
    const list = renderCard([rule('odd id&more', 'Odd Id', 0.9, {category: 'direct'})]);
    expect(list.getByRole('link', {name: 'Inspect Odd Id'})).toHaveAttribute(
      'href',
      '/calibration?rule=odd%20id%26more',
    );
  });
});
```

The cases follow R2-1's mapping. The section is the artifact's `category`, so the direct rules here are keyed by their own ids in `directRules` and never ask the engine. The playstyle rules with no `playstyleId` field (`ramp`, `lore-loss` and `location-boost`) ask the pinned engine for their key.

Then add a case at the end of `src/ui/__tests__/BiasBar.test.tsx` (lines 42-46). Current:

```tsx
  it('is hidden from assistive tech, since the gap is printed beside it', () => {
    const {container} = render(<BiasBar gap={-1} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
```

New:

```tsx
  it('is hidden from assistive tech, since the gap is printed beside it', () => {
    const {container} = render(<BiasBar gap={-1} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps 64px by default, and shrinks with its track when the caller lifts the floor', () => {
    expect(render(<BiasBar gap={1} />).container.firstElementChild).toHaveStyle({minWidth: '64px'});
    expect(render(<BiasBar gap={1} minWidth={0} />).container.firstElementChild).toHaveStyle({minWidth: '0px'});
  });
});
```

- [ ] **Step 3: Expect "Inspect" for Singer + Songs on the Overview**

In `src/tools/analytics/overview/__tests__/OverviewView.test.tsx` (lines 65-70). Current:

```tsx
    expect(within(list).getAllByRole('link').map((link) => link.getAttribute('aria-label'))).toEqual([
      'Tune Discard',
      'Tune Ramp',
      'Tune Shift Targets',
      'Tune Singer + Songs',
    ]);
```

New:

```tsx
    expect(within(list).getAllByRole('link').map((link) => link.getAttribute('aria-label'))).toEqual([
      'Tune Discard',
      'Tune Ramp',
      'Tune Shift Targets',
      // A direct rule with no tuning.json copy (R-22).
      'Inspect Singer + Songs',
    ]);
```

The fixtures carry no `playstyleId`, the shape of an artifact written before R2.
- `discard` and `ramp` are playstyle rules. The pinned engine gives their keys, their own ids, and both have entries.
- `shift-targets` and `singer-songs` are direct, so they are keyed by their own ids without asking the engine. `shift-targets` holds the one `directRules` entry, and `singer-songs` has none.

- [ ] **Step 4: Run them and watch them fail**

```bash
pnpm vitest run src/ui/__tests__/BiasBar.test.tsx src/tools/analytics/overview/__tests__/RulesToReviewCard.test.tsx src/tools/analytics/overview/__tests__/OverviewView.test.tsx
```

Expected: `Test Files  3 failed (3)` and `Tests  6 failed | 21 passed (27)`, with these failures:
- `BiasBar > keeps 64px by default, and shrinks with its track when the caller lifts the floor`: `Error: expect(element).toHaveStyle()`, with the diff line `- minWidth: 0px;`, at line 49. Today's bar ignores the prop and keeps `min-width: 64px`.
- `OverviewView > lists the rules to review widest gap first, leaving out thin and unvoted rules`: `AssertionError: expected [ 'Tune Discard', 'Tune Ramp', …(2) ] to deeply equal [ 'Tune Discard', 'Tune Ramp', …(2) ]`
- `RulesToReviewCard > says Tune for a rule with a tuning.json copy and Inspect for one without (R-22)`: `AssertionError: expected [ [ 'Tune', 'Tune Ramp' ], …(2) ] to deeply equal [ [ 'Tune', 'Tune Ramp' ], …(2) ]`
- `RulesToReviewCard > opens Calibration on the rule either way`: `TestingLibraryElementError: Unable to find an accessible element with the role "link" and name "Inspect Singer + Songs"`
- `RulesToReviewCard > takes the artifact's playstyleId first (R-17), against the pinned tuning.json`: `AssertionError: expected [ [ 'Tune', …(1) ], …(2) ] to deeply equal [ [ 'Tune', …(1) ], …(2) ]`
- `RulesToReviewCard > escapes the rule id in the link`: `TestingLibraryElementError: Unable to find an accessible element with the role "link" and name "Inspect Odd Id"`

"finds a copy kept under another key…" already passes, because today's card says "Tune" for every rule. It guards the mapping: a check keyed on the raw rule id would find no `lore-loss` entry and say "Inspect". `BiasBar`'s other eight cases pass too.

- [ ] **Step 5: Let the bar follow its track, and choose the verb from the pinned tuning.json**

In `src/ui/BiasBar.tsx`, the props (lines 9-14). Current:

```tsx
interface BiasBarProps {
  /** Community minus engine: negative = the engine over-rates. Null = no scored votes. */
  gap: number | null;
  /** The |gap| that fills a half-track (default 2.5 points). */
  scale?: number;
}
```

New:

```tsx
interface BiasBarProps {
  /** Community minus engine: negative = the engine over-rates. Null = no scored votes. */
  gap: number | null;
  /** The |gap| that fills a half-track (default 2.5 points). */
  scale?: number;
  /**
   * The bar's narrowest width in px (default 64). A grid that sizes the bar's
   * track itself passes 0, so the bar never runs past its track.
   */
  minWidth?: number;
}
```

The signature and the root's style (lines 30-35). Current:

```tsx
export function BiasBar({gap, scale = DEFAULT_SCALE}: BiasBarProps) {
  const fill = fillFor(gap, scale);
  return (
    <div
      aria-hidden="true"
      style={{position: 'relative', height: TRACK, minWidth: 64, background: ADMIN_COLORS.barTrack, borderRadius: RADIUS.xs}}>
```

New:

```tsx
export function BiasBar({gap, scale = DEFAULT_SCALE, minWidth = 64}: BiasBarProps) {
  const fill = fillFor(gap, scale);
  return (
    <div
      aria-hidden="true"
      style={{position: 'relative', height: TRACK, minWidth, background: ADMIN_COLORS.barTrack, borderRadius: RADIUS.xs}}>
```

The rest of the file doesn't change.

In `src/tools/analytics/overview/RulesToReviewCard.tsx`, replace the imports and the doc comment (lines 1-16). Current:

```tsx
import {SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {BiasBar} from '../../../ui/BiasBar';
import {Panel} from '../../../ui/Panel';
import {gapColor} from '../gapColor';
import {MIN_RULE_VOTES, rulesToReview} from './overviewStats';
import {PanelLink} from './PanelLink';
import type {RuleStat} from '../voteAnalyticsTypes';

/**
 * The rules most worth tuning next, widest gap first (rulesToReview leaves out
 * rules with too few votes to trust). "Tune" opens Calibration with the rule
 * picked: /calibration?rule=<ruleId>, the analytics rule id. R1-11's
 * Calibration page selects that rule; R2's maps it to its tuning.json entry.
 */
```

New:

```tsx
import {TUNING} from 'inkweave-synergy-engine';
import {SPACING, TRUNCATE} from '../../../app-bridge';
import {calibrationHref} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {BiasBar} from '../../../ui/BiasBar';
import {Panel} from '../../../ui/Panel';
import {tuningKeyFor} from '../calibration/calibrationModel';
import {gapColor} from '../gapColor';
import {MIN_RULE_VOTES, rulesToReview} from './overviewStats';
import {PanelLink} from './PanelLink';
import type {RuleStat} from '../voteAnalyticsTypes';

/**
 * "Tune" for a rule with a tuning.json copy, "Inspect" for one without (R-22):
 * some direct rules have none (six at the pin). The Overview holds no token, so
 * it looks the rule up (tuningKeyFor) in the pinned engine's bundled
 * tuning.json, TUNING. A key the app adds on master reads "Inspect" until the
 * next pin bump; the page it opens reads the live file. Both open Calibration
 * on the rule's own id, which the page resolves to the rule's row.
 */
function RuleLink({rule}: {rule: RuleStat}) {
  const verb = tuningKeyFor(rule, TUNING) == null ? 'Inspect' : 'Tune';
  return (
    <PanelLink to={calibrationHref(rule.ruleId)} label={`${verb} ${rule.ruleName}`}>
      {verb}
    </PanelLink>
  );
}

/**
 * The rules most worth tuning next, widest gap first (rulesToReview leaves out
 * rules with too few votes to trust). Each row links to Calibration with the
 * rule picked (RuleLink).
 */
```

Widen the link and gap columns (lines 34-35). Current:

```tsx
                // Names keep 80px when the card is narrow (1185–1280px viewports); the bias bar gives first.
                gridTemplateColumns: 'minmax(80px, 1fr) minmax(0, 100px) 52px 36px',
```

New:

```tsx
                // Names keep 80px on a narrow card and the bias bar's track gives first: 26px on the
                // narrowest (280px), its full 100px from 354px up. 48px fits a gap ("−0.57", 35px in
                // tabular figures at the body size) and "Inspect" (43px at the small size).
                gridTemplateColumns: 'minmax(80px, 1fr) minmax(0, 100px) 48px 48px',
```

Let the bias bar shrink with its track (line 45). Current:

```tsx
              <BiasBar gap={r.meanGap} />
```

New:

```tsx
              {/* minWidth 0: the bar shrinks with its track. At its default 64px it would run under the gap. */}
              <BiasBar gap={r.meanGap} minWidth={0} />
```

Render the link through `RuleLink` (lines 49-53). Current:

```tsx
              <span style={{textAlign: 'right'}}>
                <PanelLink to={`/calibration?rule=${encodeURIComponent(r.ruleId)}`} label={`Tune ${r.ruleName}`}>
                  Tune
                </PanelLink>
              </span>
```

New:

```tsx
              <span style={{textAlign: 'right'}}>
                <RuleLink rule={r} />
              </span>
```

The whole file now reads:

```tsx
import {TUNING} from 'inkweave-synergy-engine';
import {SPACING, TRUNCATE} from '../../../app-bridge';
import {calibrationHref} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {BiasBar} from '../../../ui/BiasBar';
import {Panel} from '../../../ui/Panel';
import {tuningKeyFor} from '../calibration/calibrationModel';
import {gapColor} from '../gapColor';
import {MIN_RULE_VOTES, rulesToReview} from './overviewStats';
import {PanelLink} from './PanelLink';
import type {RuleStat} from '../voteAnalyticsTypes';

/**
 * "Tune" for a rule with a tuning.json copy, "Inspect" for one without (R-22):
 * some direct rules have none (six at the pin). The Overview holds no token, so
 * it looks the rule up (tuningKeyFor) in the pinned engine's bundled
 * tuning.json, TUNING. A key the app adds on master reads "Inspect" until the
 * next pin bump; the page it opens reads the live file. Both open Calibration
 * on the rule's own id, which the page resolves to the rule's row.
 */
function RuleLink({rule}: {rule: RuleStat}) {
  const verb = tuningKeyFor(rule, TUNING) == null ? 'Inspect' : 'Tune';
  return (
    <PanelLink to={calibrationHref(rule.ruleId)} label={`${verb} ${rule.ruleName}`}>
      {verb}
    </PanelLink>
  );
}

/**
 * The rules most worth tuning next, widest gap first (rulesToReview leaves out
 * rules with too few votes to trust). Each row links to Calibration with the
 * rule picked (RuleLink).
 */
export function RulesToReviewCard({rules}: {rules: RuleStat[]}) {
  const top = rulesToReview(rules);
  return (
    <Panel
      title="Rules to review"
      action={<span style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>widest gap first</span>}>
      {top.length === 0 ? (
        <p style={{margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted}}>
          No rule has {MIN_RULE_VOTES} or more score votes yet.
        </p>
      ) : (
        <ul aria-label="Rules to review" style={{listStyle: 'none', margin: 0, padding: 0}}>
          {top.map((r) => (
            <li
              key={r.ruleId}
              style={{
                display: 'grid',
                // Names keep 80px on a narrow card and the bias bar's track gives first: 26px on the
                // narrowest (280px), its full 100px from 354px up. 48px fits a gap ("−0.57", 35px in
                // tabular figures at the body size) and "Inspect" (43px at the small size).
                gridTemplateColumns: 'minmax(80px, 1fr) minmax(0, 100px) 48px 48px',
                alignItems: 'center',
                gap: SPACING.md,
                padding: `${SPACING.sm}px 0`,
                borderBottom: `1px solid ${ADMIN_COLORS.divider}`,
                fontSize: ADMIN_TYPE.body,
              }}>
              <span style={TRUNCATE} title={r.ruleName}>
                {r.ruleName}
              </span>
              {/* minWidth 0: the bar shrinks with its track. At its default 64px it would run under the gap. */}
              <BiasBar gap={r.meanGap} minWidth={0} />
              <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: gapColor(r.meanGap)}}>
                {fmtGap(r.meanGap)}
              </span>
              <span style={{textAlign: 'right'}}>
                <RuleLink rule={r} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
```

Notes on the edit:
- The engine import goes straight to the package, as in `src/tools/reveal/validateForm.ts:1` and `calibrationModel.ts`. The engine is a workspace package, not app code, so it doesn't go through `src/app-bridge.ts`.
- `RuleLink` isn't exported, so `react-refresh/only-export-components` holds.
- The check stays out of `overviewStats.ts`, which `calibrationModel.ts` imports (`MIN_RULE_VOTES`). Importing back from there would make a load-order cycle.
- `BiasBar`'s default stays 64, so its other uses (R2-3's `RulesTable`, `Primitives.stories.tsx`) draw as before. Only a caller whose grid track already sizes the bar lifts the floor.

- [ ] **Step 6: Run them and watch them pass**

```bash
pnpm vitest run src/ui/__tests__/BiasBar.test.tsx src/tools/analytics/overview/__tests__/RulesToReviewCard.test.tsx src/tools/analytics/overview/__tests__/OverviewView.test.tsx
```

Expected: `Test Files  3 passed (3)` and `Tests  27 passed (27)`.

- [ ] **Step 7: Bring the comments up to date**

In `src/tools/analytics/overview/PanelLink.tsx`, line 7. Current:

```tsx
  /** The accessible name, when the visible text alone is ambiguous (four "Tune" links). */
```

New:

```tsx
  /** The accessible name, when the visible text alone is ambiguous (four "Tune" or "Inspect" links). */
```

Line 12. Current:

```tsx
/** A panel's text link ("Open calibration →", "Tune"): a router Link in the accent colour. */
```

New:

```tsx
/** A panel's text link ("Open calibration →", "Tune", "Inspect"): a router Link in the accent colour. */
```

In `src/tools/analytics/overview/overviewFixtures.ts`, line 19. Current:

```ts
  rule({ruleId: 'singer-songs', ruleName: 'Singer + Songs', category: 'direct', scoreVotes: 141, meanGap: 0.14}),
```

New:

```ts
  // A direct rule with no tuning.json copy: its link reads Inspect (R-22).
  rule({ruleId: 'singer-songs', ruleName: 'Singer + Songs', category: 'direct', scoreVotes: 141, meanGap: 0.14}),
```

Then look for any other comment that calls the Overview's links "Tune" alone. The pattern also catches a quoted `"Tune" link`:

```bash
grep -rnE "Tune\"? links?" src
```

Expected: no output. R1's `CalibrationPage.tsx` (R2-6) and `CalibrationView.tsx` with its stories (R2-7) are gone (Step 1), and R2-6's files never say "Tune link". If a hit remains, "Tune link" becomes "Tune or Inspect link", "Tune links" becomes "Tune or Inspect links", and that file joins Step 12's `git add`. Then run the grep again. Expected: no output.

Run the overview folder:

```bash
pnpm vitest run src/tools/analytics/overview
```

Expected: `Test Files  6 passed (6)` and `Tests  53 passed (53)`. That is R1's four files and 47 tests, R2-7's `CalibrationCard.test.tsx` (1 test) and this task's card test (5 tests).

- [ ] **Step 8: Lint and typecheck**

```bash
pnpm lint
pnpm typecheck
```

Expected: both exit 0.

- [ ] **Step 9: Measure the rows in Storybook**

jsdom has no layout, so no test sees the columns. Measure them in the browser pane, with this session's preview tools:
1. Start Storybook with the preview tool's `admin-storybook` configuration (`.claude/launch.json`), not `pnpm storybook` in a shell.
2. Open `http://localhost:6007/iframe.html?id=admin-insights-overview--full-data&viewMode=story`, and set the viewport to 944px wide (any height, such as 900). Storybook's layout is fullscreen, and the story's frame pads 32px a side. That leaves 880px: the three cards at their 280px minimum, each with a 238px list.
3. Run this with the browser pane's JavaScript tool:
   ```js
   (() => {
     const ul = document.querySelector('ul[aria-label="Rules to review"]');
     return {
       scrollbar: window.innerWidth - document.documentElement.clientWidth,
       rows: [...ul.children].map((li) => {
         const [, bar, gap, cell] = li.children;
         const text = document.createRange();
         text.selectNodeContents(gap);
         return {
           list: ul.getBoundingClientRect().width,
           bar: bar.getBoundingClientRect().width,
           clearOfGap: bar.getBoundingClientRect().right <= text.getBoundingClientRect().left,
           linkInside: cell.firstElementChild.getBoundingClientRect().right <= li.getBoundingClientRect().right,
         };
       }),
     };
   })();
   ```
   - If `scrollbar` isn't 0, the story is taller than the viewport, and its scrollbar has taken that much width from the frame. The cards then wrap two-up, and `list` reads about 380. Widen the viewport by `scrollbar` and run the snippet again. Under the app's 8px `::-webkit-scrollbar` rule, that makes 952px.
   - Expected for every row: `list: 238`, `bar: 26`, `clearOfGap: true` and `linkInside: true`. If `list` still isn't 238, adjust the width until it is.
4. Look at the card. Singer + Songs reads "Inspect", right-aligned with the "Tune" links above it.
5. Widen the viewport to 1440px and run the snippet again. Expected: `bar: 100` on every row, and both checks still `true`.
6. Open the `NarrowCard` story (`id=admin-insights-overview--narrow-card`) and run the snippet again. Expected: `list: 298`, `bar: 86`, and both checks `true` on every row.

Afterwards, stop Storybook with the preview tool, and set the viewport back to its desktop preset. A running preview server makes the pre-commit hook's Vitest fail to start its workers.

- [ ] **Step 10: Run the full suite**

```bash
pnpm test:run
```

Expected: exit 0.

- [ ] **Step 11: Check with real data (when the owner's snapshot is in `public/admin-data/`)**

If `public/admin-data/vote-analytics.json` exists locally (the owner's saved copy, "Seeing R1 with real data locally"; never commit it):
1. Start the dev server with the preview tool's `admin-dev` configuration (`.claude/launch.json`), not `pnpm dev` in a shell, and open `http://localhost:5180/`.
2. In "Rules to review", every link reads "Tune", except rules among the six with no copy (`named-companions`, `singer-songs`, `spike-suit`, `merida-archer`, `merida-wisp`, `free-play`), which read "Inspect".
3. Click an "Inspect" link. It opens `/calibration?rule=<that rule's id>` with the rule selected in the table. With a token saved, the aside says "No copy in tuning.json" (R-20).
4. Stop the dev server with the preview tool.

Without the snapshot, skip this step and say so in the report. The unit tests cover both verbs.

- [ ] **Step 12: Commit**

After the owner approves, with the Bash tool. Add any file Step 7's grep led you to change to the `git add` line:

```bash
git add src/ui/BiasBar.tsx src/ui/__tests__/BiasBar.test.tsx src/tools/analytics/overview/RulesToReviewCard.tsx src/tools/analytics/overview/PanelLink.tsx src/tools/analytics/overview/overviewFixtures.ts src/tools/analytics/overview/__tests__/RulesToReviewCard.test.tsx src/tools/analytics/overview/__tests__/OverviewView.test.tsx
USER_APPROVED=1 git commit -m "feat(overview): say Inspect for rules with no tuning copy (#24)"
```

<!--
Review pass on R2-8 (notes 1-6): every note checked against the repo at c92e260, the pin at bc877e1 and the R2-1/R2-7/header drafts, and applied. None rejected.
- Note 1 (bias bar under the gap): took the recommended BiasBar minWidth prop. Numbers re-measured with the gap span's tabular figures (the font's tnum lookup: signed gap 35.0px, not the review's proportional 36.2px). Today's overlap is about 1px on 280px cards only, R2-8's unfixed template 13px on cards narrower than about 293px. The conclusion is unchanged.
- Note 2 (Step 9): took the measured check. The review's 15px classic scrollbar becomes "read it from the page". The app's index.css styles ::-webkit-scrollbar at 8px, which Chromium applies to the story's viewport, so the width is likely 952px, not 959px. Added bar: 26 / 100 / 86 to the expectations, and wrapped the snippet in an IIFE so it can run twice on one page.
- Note 3 (grep): R2-8 now runs after R2-7. Because of that, Step 7's overview counts become 6 files / 53 tests (R2-7 adds CalibrationCard.test.tsx, 1 test), checked in the sandbox.
- Note 5: Files is fixed here. The header's task table (OverviewView.test.tsx:66-71) is in header.md, outside this file. It is handed off under "When the plan is assembled".
-->
