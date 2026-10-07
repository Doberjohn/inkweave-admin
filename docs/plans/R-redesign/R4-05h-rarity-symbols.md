> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-5h, 2026-10-07).** This task is new. It is decision R-83, and it folds in Doberjohn/inkweave-admin#32 ("Draw printing symbols through RaritySymbol and drop the bridged webps", filed by R3-9 from R3-1's flag). The outline has no such task. Its contract addition 1 (`R4-card-studio.md:6-13`) still says `RaritySymbol` "has no Enchanted entry" and bridges `enchantedSymbol` for the picker. That is wrong at both pins. The task is written against main @ `e5e5029` with the app pin `upstream/inkweave` @ `16283a13`, and R1-R3 as built.
> - **The app at the pin.**
>   - `RaritySymbol` (`features/reveals/RaritySymbol.tsx`) keys its files by the rarity lowercased (`:11-21`). There are eight keys: `common`, `uncommon`, `rare`, `super rare`, `legendary`, `epic`, `enchanted` and `iconic`. The three printings use the same `?no-inline` webps that admin bridges today (`:6-9`). For any other key it returns `null` (`:36-37`).
>   - `rarity.ts` keys the printings "in the same key space as RARITIES" (`SPECIAL_RARITIES`, `:25-34`). `rarityConfigOf` normalises with `trim().toLowerCase()` (`:37-41`) but knows only the five rarities (`RARITIES`, `:17-23`).
>   - Neither file changed between the old pin `bc877e1` and `16283a13`. `git -C upstream/inkweave diff --stat bc877e1 16283a13 -- apps/web/src/features/reveals apps/web/src/assets` prints nothing. So the audit's evidence still holds, line for line.
> - **What /web receives.** `reveal_card_click` sends `rarity: printing?.rarity ?? card.rarity ?? null` (`pages/RevealsPage.tsx:139`). For a special printing that is the printing's rarity: "Enchanted", "Epic" or "Iconic" (`shared/lib/analytics.ts:18`). The owner's local snapshot (`public/admin-data/vercel-analytics.json`) has all three in Reveal card clicks' "By rarity". `BreakdownCards.tsx:24`'s comment (`card.rarity ?? null`) is out of date too, so this task fixes it.
> - **What changes.**
>   - `src/app-bridge.ts` drops the three webp re-exports and their comment (`:78-82`). It rewrites the RaritySymbol comment (`:74-75`), which wrongly says "Common to Legendary". `RaritySymbol` and `rarityConfigOf` stay exported:
>     - `CardHeader` (R-49) uses `rarityConfigOf` so that printings stay out of the card header;
>     - R4-5c's rarity picker draws through `RaritySymbol` (R-83).
>   - `BreakdownCards.tsx`'s `ValueIcon` passes the value, trimmed and lowercased, straight to `RaritySymbol`. That one call covers the five rarities and the three printings. "Others" still draws nothing, because RaritySymbol returns `null` for it. `PRINTING_SYMBOLS`, the hand-built `<img>` and the `rarityConfigOf` import go.
>   - The function's cyclomatic complexity falls from 5 to 3, and the file loses 23 lines.
> - **Why not `rarityConfigOf` first and the printing keys second?** `rarityConfigOf(value).key` is always `value.trim().toLowerCase()` when it isn't `undefined` (`rarity.ts:39`). A separate printing step would bring back a second list of printings. That list is the duplication #32 asks to remove.
> - **The tests.**
>   - **The fixture.** The REVEALS fixture's "By rarity" breakdown gains Epic and Iconic rows, so every printing has a row. The existing rarity test keeps the row order and the plain "Others", and its percentages are recomputed.
>   - **The glyph table.** A new `it.each` table renders `RaritySymbol` alone for each key and checks that the row's icon has the same `src`. Comparing with RaritySymbol's own output keeps the test free of asset paths. In Vitest, Common is an inlined SVG data URL, and the webps are `/@fs/…` or `/upstream/…` URLs, depending on the root.
>   - **Why the new cases pass on today's code.** Today's printing branch draws the very `?no-inline` files that RaritySymbol imports. So the cases pin the behaviour, and Step 3 runs them green before any change.
>   - **Where the red comes from.** Step 4 removes the bridge lines first. Vitest's bridge mock then refuses the missing names while it collects the file. Step 5's rewrite turns it green.
>   - **What the table catches.** In the sandbox, passing `value` unlowered failed all five glyph cases (`5 failed | 26 passed (31)`). If a pin bump drops a printing key from RaritySymbol, the table fails with "RaritySymbol draws nothing for 'epic'".
> - **Bridge line numbers.** They are main's: `:74-82`. R4-5a adds `InkwellIcon` beside `InkIcon` (`:46`), above this hunk: two lines in its draft (a comment and the export), so the hunk sits two lines lower, at `:76-84`. Step 4 names its anchor text, so line numbers don't matter. No other task before this one edits the bridge.
> - **Reveal-sync.** `scripts/reveal-sync/web.mjs:47` loads `src/app-bridge.ts` through Vite's `runnerImport`.
>   - The bridge is not one of the four contract files, and the change only removes exports. Still, Step 6 runs `web.test.mjs`, the bridge's loader test, once.
>   - The bridge still imports assets through `RaritySymbol` (its svgs and the same webps). So R4-5a's reworded `web.test.mjs` premise, "assets already load", holds after this task.
> - **Docs this task leaves to the controller.**
>   - `docs/plans/R-redesign.md` has two lines about the webps: the correction "Icons (R1, R3, R4) … (plus the Enchanted webp)" (`:114`), and the bridge record "R1-10 adds … enchantedSymbol, epicSymbol, iconicSymbol" (`:672`). As in R3, the plan commit (R4-0) writes this task's line in the bridge record, and R4-8 checks it. See "Notes for later tasks".
>   - The app's `CLAUDE.md:225` lists `src/assets/{enchanted,epic,iconic}.webp` among the files admin bridges. Admin writes to the app only through the GitHub API, so R4-8 folds this into its app follow-up.
> - **Code Health.**
>   - **Hand count, `BreakdownCards.tsx`.** `inkOf(prop: string, value: string)` has 2 primitive parameters. `ValueIcon`, `BreakdownCard` and `BreakdownCards` take one props object each. That is 2 of 5 parameters (40%), the same as at main.
>     - R1-10 shipped the file at that share through R1's PR gate (PR #25), and this task adds no parameter.
>     - If the PR's check flags it anyway, `inkOf` can take the `{prop, value}` object that `ValueIcon` already receives.
>   - **Hand count, the test file.** It gains no helper, and the `it.each` callback takes one object.
>   - **Local scores** (CodeScene MCP 1.5.7, on the sandbox's files):
>     - `BreakdownCards.tsx` 10.0 with no findings (main: 10);
>     - `WebAnalyticsBody.test.tsx` 10.0 with no findings (main: 10);
>     - `WebAnalyticsBody.stories.tsx` 10;
>     - `src/app-bridge.ts` gets no score, at main or after, because it holds only re-exports.
>   - **Untouched.** `src/github/githubCommit.ts` is not touched.
> - **Verified in a scratch sandbox** (`scratchpad/r4-rebase/sandbox-r45h`).
>   - **Setup.** The sandbox held a copy of `src`, `scripts/reveal-sync` and the configs from the working tree: main `b490fb7` plus the uncommitted pin bump to `16283a13`, which changes no `src` file.
>     - `node_modules` and `upstream` were junctioned in read-only.
>     - Vite's cache (`cacheDir`) and the tsbuildinfo files stayed in the sandbox.
>     - `server.fs.strict: false` was needed, because the junction resolves outside the sandbox root. The repo needs neither change.
>     - CodeScene ran on copies in a throwaway `git init` folder beside the sandbox, because the CLI needs a git work tree.
>   - **Results.**
>     - **Step 3.** The new tests against today's code: `Test Files  3 passed (3)`, `Tests  50 passed (50)`.
>     - **Step 4.** With the bridge edited and `BreakdownCards.tsx` untouched, Vitest gave the collection error quoted in Step 4: `1 failed | 2 passed (3)`, `19 passed (19)`. `tsc -b` exited 2 with the three `TS2305` errors quoted in Step 6.
>     - **Step 5.** With the rewrite, the web folder plus `CardAnalyticsView.test.tsx` gave `4 passed (4)` and `87 passed (87)`.
>     - **Step 6.**
>       - `tsc -b` exits 0.
>       - `scripts/reveal-sync/web.test.mjs` gives `2 passed (2)`.
>       - All four files pass `pnpm exec eslint --max-warnings=0 --stdin --stdin-filename <repo path>` from the repo.
>     - **Wider run.** `src/tools/analytics/web` plus `src/tools/analytics/cards` gave `19 passed (19)` and `393 passed (393)`.
>   - **Not run.** No dev server or Storybook (Step 8 is the browser check).
> - **Not taken.**
>   - **Guarding keys such as `constructor`.** RaritySymbol looks keys up in a plain object. A value named after an `Object.prototype` member would draw a broken `<img>`; the sandbox drew `src="function Object() { [native code] }"`. Today's `PRINTING_SYMBOLS[...]` lookup had the same hole. The values are the app's own rarity names, so this is not worth a guard. If it ever matters, the fix belongs in the app (`Object.hasOwn`).
>   - **Bridging `SPECIAL_RARITIES`.** Nothing needs the printing list itself.
>   - **A separate bridge contract test.** The glyph table already fails if RaritySymbol stops drawing a printing.
>   - **Editing `docs/plans/R-redesign.md` or the app's docs.** See "Docs this task leaves to the controller" above.

### Task R4-5h: Draw printings through RaritySymbol (R-83, admin#32)

**Files:**
- Modify `src/app-bridge.ts`: the RaritySymbol comment (`:74-75`), and the webp comment and exports (`:78-82`). These are main's line numbers. R4-5a's `InkwellIcon` export sits above them.
- Modify `src/tools/analytics/web/BreakdownCards.tsx`:
  - the imports (`:1-12`);
  - `RARITY_PROP`'s comment (`:24`);
  - `PRINTING_SYMBOLS` (`:27-28`);
  - `ValueIcon` and its comment (`:38-63`).
- Test, modify `src/tools/analytics/web/__tests__/WebAnalyticsBody.test.tsx`:
  - the imports (`:3-4`);
  - the REVEALS fixture's rarity rows (`:37`);
  - the rarity test (`:316-329`).
- Modify `src/tools/analytics/web/WebAnalyticsBody.stories.tsx`: the "By rarity" rows (`:107-108`).

No earlier R4 task touches the last three files.

**Interfaces:**
- **Consumes** (app pin `16283a13`, `upstream/inkweave/apps/web/src/`):
  ```ts
  // features/reveals/RaritySymbol.tsx:23-28, :35-48 (bridged since R1-10)
  export function RaritySymbol(props: {rarity: string; size: number}): JSX.Element | null;
  //   rarity is a lowercase key: 'common' | 'uncommon' | 'rare' | 'super rare' | 'legendary' | 'epic' | 'enchanted' | 'iconic' (:11-21)
  //   draws <img src alt="" aria-hidden width={size} height={size}>; null for any other key (:36-37)
  // features/reveals/rarity.ts:37-41 (bridged since R1-10, unchanged here)
  export function rarityConfigOf(rarity: string | undefined): {key: string; name: string} | undefined; // the five rarities only
  ```
- **Produces:**
  ```ts
  // src/app-bridge.ts (R4-5h, R-83) loses: enchantedSymbol, epicSymbol, iconicSymbol (the three ?no-inline webps)
  //   and keeps RaritySymbol and rarityConfigOf, with a corrected comment
  // src/tools/analytics/web/BreakdownCards.tsx: exports unchanged; a "rarity" row's icon is
  //   <RaritySymbol rarity={value.trim().toLowerCase()} size={18} />, so Enchanted, Epic and Iconic rows
  //   draw the same glyph RaritySymbol draws everywhere, and "Others" draws none
  ```
- **What tests and pages can rely on in the DOM.**
  - A rarity or printing row holds one `<img alt="" aria-hidden="true">`, with the same `src` as `RaritySymbol` gives for its key.
  - An "Others" row, a "(not set)" row, or any other value has no `img`.

- [ ] **Step 1: Check what this task builds on**

From the repo root, with the Bash tool:

```bash
git branch --show-current
git -C upstream/inkweave rev-parse --short=8 HEAD
git status --short -- src docs/plans
grep -n "^| R-83 |" docs/plans/R-redesign.md
grep -nE "InkwellIcon|RaritySymbol|rarityConfigOf|Symbol\} from" src/app-bridge.ts
grep -rnE "enchantedSymbol|epicSymbol|iconicSymbol|PRINTING_SYMBOLS" src .storybook scripts
grep -nE "^  (epic|enchanted|iconic):" upstream/inkweave/apps/web/src/features/reveals/RaritySymbol.tsx
```

Expected:
- `feature/24-redesign-r4`.
- `16283a13`.
- No output from `git status`.
- One line: R-83, written by the plan commit (R4-0).
- The bridge lines. At main they are `:74`, `:76`, `:77`, `:78` and `:80-82`, in this order:
  - the RaritySymbol comment;
  - the `RaritySymbol` and `rarityConfigOf` exports;
  - the webp comment;
  - the three `export {default as …Symbol} from '…webp?no-inline'` lines.

  R4-5a's `export {InkwellIcon} from …` line comes first. R4-5a's draft adds two lines after `:46` (a comment, then the export), so on the R4 branch the grep prints `:48`, then `:76`, `:78`, `:79`, `:80` and `:82-84`. If R4-5a added a different number of lines, each line after `:46` moves by that number instead.
- Exactly eight lines: the three bridge exports, and `BreakdownCards.tsx:8`, `:9`, `:10`, `:28` and `:51`.
- Three lines: `18:  epic: epicSymbol,`, `19:  enchanted: enchantedSymbol,` and `20:  iconic: iconicSymbol,`.

What to do when the output differs:
- **The branch or the pin differs, or `git status` lists files.**
  - Stop: R4 is cut from main after the pin bump, and the plan commit comes first.
  - If a later pin moved RaritySymbol, re-check the line numbers under Interfaces. Step 3's table will say whether it still draws the printings.
- **There is no `InkwellIcon` line.** R4-5a hasn't landed. This task doesn't depend on it, so go on. Tell the controller, because R4-5a's bridge hunk will then sit above this task's.
- **The webp lines are already gone.** An earlier task took them. Read `git log -p -S enchantedSymbol -- src/app-bridge.ts` and report before going on.
- **The names grep (`enchantedSymbol|…|PRINTING_SYMBOLS`) finds a file other than the bridge and `BreakdownCards.tsx`.** An earlier task uses a webp. Draw it through `RaritySymbol` in the same way (`rarity={key}`), and add the file to Step 9's `git add`.
- **The last grep prints fewer than three lines.** RaritySymbol no longer draws a printing at this pin. Stop and report: R-83's premise is gone.

If this checkout hasn't built the engine since the pin bump, run `pnpm build:engine` once.

- [ ] **Step 2: Pin each rarity row's icon to RaritySymbol's glyph**

In `src/tools/analytics/web/__tests__/WebAnalyticsBody.test.tsx`, the imports (lines 3-4). Current:

```tsx
import userEvent from '@testing-library/user-event';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
```

New:

```tsx
import userEvent from '@testing-library/user-event';
import {RaritySymbol} from '../../../../app-bridge';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
```

The file mocks the bridge with `importOriginal` and overrides only `useContainerWidth` (lines 10-13), so this is the real `RaritySymbol`.

The REVEALS fixture's rarity rows (line 37). Current:

```tsx
      rows: [row('Others', 50), row('Common', 30), row('Enchanted', 10), row('Super Rare', 20)],
    },
```

New:

```tsx
      // A special printing's click reports the printing's rarity: Enchanted, Epic or Iconic.
      rows: [
        row('Others', 50),
        row('Common', 30),
        row('Enchanted', 10),
        row('Super Rare', 20),
        row('Epic', 6),
        row('Iconic', 4),
      ],
    },
```

The rarity test (lines 316-329). Current:

```tsx
  it('puts the rarity symbol on every rarity, and text alone on Others', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    expect(rowsAround('Common')).toEqual([
      'Common: 30 (27%)',
      'Enchanted: 10 (9%)',
      'Super Rare: 20 (18%)',
      'Others: 50 (45%)',
    ]);
    expect(screen.getByText('Common').closest('li')!.querySelector('img')).not.toBeNull();
    expect(screen.getByText('Super Rare').closest('li')!.querySelector('img')).not.toBeNull();
    expect(screen.getByText('Enchanted').closest('li')!.querySelector('img')).not.toBeNull();
    const rarityList = screen.getByText('Common').closest('ul')!;
    expect(within(rarityList).getByText('Others').closest('li')!.querySelector('img')).toBeNull();
  });
```

New:

```tsx
  it('lists the rarities and printings, and keeps "Others" last, as text alone', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    expect(rowsAround('Common')).toEqual([
      'Common: 30 (25%)',
      'Enchanted: 10 (8%)',
      'Super Rare: 20 (17%)',
      'Epic: 6 (5%)',
      'Iconic: 4 (3%)',
      'Others: 50 (42%)',
    ]);
    const rarityList = screen.getByText('Common').closest('ul')!;
    expect(within(rarityList).getByText('Others').closest('li')!.querySelector('img')).toBeNull();
  });

  // RaritySymbol draws the three printings as well as the five rarities (R-83, admin#32),
  // keyed by the value lowercased, as the app keys them (rarity.ts).
  it.each([
    {value: 'Common', key: 'common'},
    {value: 'Super Rare', key: 'super rare'},
    {value: 'Enchanted', key: 'enchanted'},
    {value: 'Epic', key: 'epic'},
    {value: 'Iconic', key: 'iconic'},
  ])("draws the $value row's icon as RaritySymbol's '$key' glyph", ({value, key}) => {
    const glyph = render(<RaritySymbol rarity={key} size={18} />).container.querySelector('img');
    expect(glyph, `RaritySymbol draws nothing for '${key}'`).not.toBeNull();
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    const icon = screen.getByText(value).closest('li')!.querySelector('img');
    expect(icon).toHaveAttribute('src', glyph!.getAttribute('src'));
  });
```

Notes on the test:
- **The percentages.** The six rows sum to 120: 30/120 is 25%, 10/120 is 8.3%, 20/120 is 16.7%, 6/120 is 5%, 4/120 is 3.3% and 50/120 is 41.7%. `breakdownShares` keeps the input order and moves "Others" to the end (`webModel.ts:81-96`). No other test reads this breakdown: the ink test uses Amber, and the blank-row test uses Frozen.
- **Why compare with RaritySymbol's own `src`.** Vitest inlines Common's small SVG as a data URL, and serves the webps under a path that depends on the root. So the test never names an asset path. The `RaritySymbol` render has no text, so `getByText(value)` finds only the breakdown row.
- **What the table catches.**
  - A row whose key isn't lowercased draws nothing, and its case fails on `null`.
  - A pin bump that drops a printing from RaritySymbol fails on the named message.
- **CodeScene.** No new helper. The table's rows are objects, and the callback takes one object.

- [ ] **Step 3: Run the tests on today's code, and watch them pass**

```bash
pnpm vitest run --project app src/tools/analytics/web
```

Expected: `Test Files  3 passed (3)` and `Tests  50 passed (50)`. The folder had 45 tests. The rarity test is replaced by one test plus five table rows, so the folder gains 5.

They pass before any change. Today's `PRINTING_SYMBOLS` draws the very `?no-inline` files that RaritySymbol imports (`RaritySymbol.tsx:6-9`), so both code paths give the same `src`. These cases pin that behaviour, and Steps 4 and 5 change the code under them.

- [ ] **Step 4: Drop the webps from the bridge, and watch the old printing code fail**

In `src/app-bridge.ts`, the rarity block. At main it is lines 74-82 (76-84 after R4-5a's two lines), just after the `scoreUtils` export and before the `PINNED_PREVIEW_CARDS_JSON` comment. Current:

```ts
// RaritySymbol draws Common to Legendary; rarityConfigOf maps a card's rarity
// ("Super Rare") to the same five keys and returns undefined for any other.
export {RaritySymbol} from '../upstream/inkweave/apps/web/src/features/reveals/RaritySymbol';
export {rarityConfigOf} from '../upstream/inkweave/apps/web/src/features/reveals/rarity';
// Enchanted, Epic and Iconic are printings RaritySymbol doesn't draw; the app's
// PrintingPills shows them from these files (?no-inline keeps them out of the JS).
export {default as enchantedSymbol} from '../upstream/inkweave/apps/web/src/assets/enchanted.webp?no-inline';
export {default as epicSymbol} from '../upstream/inkweave/apps/web/src/assets/epic.webp?no-inline';
export {default as iconicSymbol} from '../upstream/inkweave/apps/web/src/assets/iconic.webp?no-inline';
```

New:

```ts
// RaritySymbol draws a rarity by its lowercase key ("super rare"): the five
// rarities, Common to Legendary, and the Enchanted, Epic and Iconic printings.
// It draws nothing for any other key. rarityConfigOf maps a card's rarity
// ("Super Rare") to one of the five and returns undefined for anything else,
// a printing included.
export {RaritySymbol} from '../upstream/inkweave/apps/web/src/features/reveals/RaritySymbol';
export {rarityConfigOf} from '../upstream/inkweave/apps/web/src/features/reveals/rarity';
```

Leave the rest of the file as it is, R4-5a's `InkwellIcon` line included.

Run the web tests again:

```bash
pnpm vitest run --project app src/tools/analytics/web
```

Expected: `WebAnalyticsBody.test.tsx` fails while Vitest collects it, before any test runs:

```
 FAIL  |app| src/tools/analytics/web/__tests__/WebAnalyticsBody.test.tsx [ src/tools/analytics/web/__tests__/WebAnalyticsBody.test.tsx ]
Error: [vitest] No "enchantedSymbol" export is defined on the "../../../../app-bridge" mock. Did you forget to return it from "vi.mock"?
 ❯ src/tools/analytics/web/BreakdownCards.tsx:28:62
 ❯ src/tools/analytics/web/WebAnalyticsBody.tsx:7:1
 Test Files  1 failed | 2 passed (3)
      Tests  19 passed (19)
```

`BreakdownCards.tsx` still reads the three names when its `PRINTING_SYMBOLS` table loads (line 28). The test's partial mock refuses a name the real module no longer exports.

- [ ] **Step 5: Draw every rarity row through RaritySymbol**

In `src/tools/analytics/web/BreakdownCards.tsx`, the imports (lines 1-12). Current:

```tsx
import {
  ALL_INKS,
  INK_COLORS,
  InkIcon,
  RaritySymbol,
  SPACING,
  TRUNCATE,
  enchantedSymbol,
  epicSymbol,
  iconicSymbol,
  rarityConfigOf,
} from '../../../app-bridge';
```

New:

```tsx
import {ALL_INKS, INK_COLORS, InkIcon, RaritySymbol, SPACING, TRUNCATE} from '../../../app-bridge';
```

`RARITY_PROP` and `PRINTING_SYMBOLS` (lines 24-28). Current:

```tsx
/** The eventData prop that carries a card's rarity (reveal_card_click sends `card.rarity ?? null`). */
const RARITY_PROP = 'rarity';

/** Printings RaritySymbol doesn't draw; the app shows them from these webps (PrintingPills). */
const PRINTING_SYMBOLS: Record<string, string> = {enchanted: enchantedSymbol, epic: epicSymbol, iconic: iconicSymbol};
```

New:

```tsx
/**
 * The eventData prop that carries a rarity. reveal_card_click sends the card's, or for
 * a special printing the printing's: `printing?.rarity ?? card.rarity ?? null`.
 */
const RARITY_PROP = 'rarity';
```

`ValueIcon` and its comment (lines 38-63). Current:

```tsx
/**
 * The icon in front of a row's value: the app's ink icon on ink props. On the
 * rarity prop, RaritySymbol draws Common to Legendary (the five keys
 * rarityConfigOf knows) and the printing webps cover Enchanted, Epic and
 * Iconic. "Others" and any other value show their text alone. A blank value
 * (NOT_SET_LABEL) never gets here: it has no ink or rarity to look up.
 */
function ValueIcon({prop, value}: {prop: string; value: string}) {
  const ink = inkOf(prop, value);
  if (ink) return <InkIcon ink={ink} size={ICON_SIZE} />;
  if (prop !== RARITY_PROP) return null;
  const rarity = rarityConfigOf(value);
  if (rarity) return <RaritySymbol rarity={rarity.key} size={ICON_SIZE} />;
  const printing = PRINTING_SYMBOLS[value.trim().toLowerCase()];
  if (!printing) return null;
  return (
    <img
      src={printing}
      alt=""
      aria-hidden
      width={ICON_SIZE}
      height={ICON_SIZE}
      style={{display: 'block', flexShrink: 0, objectFit: 'contain'}}
    />
  );
}
```

New:

```tsx
/**
 * The icon in front of a row's value: the app's ink icon on ink props, and
 * RaritySymbol's glyph on the rarity prop. RaritySymbol is keyed by the rarity
 * lowercased, as the app keys it ("Super Rare" is "super rare"), and draws the
 * five rarities and the Enchanted, Epic and Iconic printings. It draws nothing
 * for any other key, so "Others" shows its text alone. A blank value
 * (NOT_SET_LABEL) never gets here: it has no ink or rarity to look up.
 */
function ValueIcon({prop, value}: {prop: string; value: string}) {
  const ink = inkOf(prop, value);
  if (ink) return <InkIcon ink={ink} size={ICON_SIZE} />;
  if (prop !== RARITY_PROP) return null;
  return <RaritySymbol rarity={value.trim().toLowerCase()} size={ICON_SIZE} />;
}
```

The rest of the file (`INK_PROPS`, `ICON_SIZE`, `inkOf`, `BreakdownCard`, `BreakdownCards`) doesn't change. Notes:
- **The `<img>`.** The one `RaritySymbol` renders is the same element the removed branch built by hand (`RaritySymbol.tsx:39-46`): `alt=""`, `aria-hidden`, an 18px box, `objectFit: 'contain'`. Nothing on the page moves.
- **The key.** It is the normalisation `rarityConfigOf` uses (`rarity.ts:39`), so the five rarities get the same keys as before. The printings get their own keys in the same key space (`SPECIAL_RARITIES`, `rarity.ts:25-34`).

Run the web tests, and the card page's R-49 cases, which use the same two bridge names:

```bash
pnpm vitest run --project app src/tools/analytics/web src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx
```

Expected: `Test Files  4 passed (4)` and `Tests  87 passed (87)`: the web folder's 50 and `CardAnalyticsView.test.tsx`'s 37. The latter's printing case (line 89) still finds no glyph in the card header, because `CardHeader` goes through `rarityConfigOf`, which knows only the five (R-49).

- [ ] **Step 6: Show the printings in the story, then lint, typecheck and load the bridge as reveal-sync does**

In `src/tools/analytics/web/WebAnalyticsBody.stories.tsx`, the "By rarity" rows (lines 107-108). Current:

```tsx
            {value: 'Legendary', count: 620, visitors: 260},
            {value: 'Enchanted', count: 300, visitors: 140},
          ],
```

New:

```tsx
            {value: 'Legendary', count: 620, visitors: 260},
            // Special printings: a click on one reports the printing's rarity.
            {value: 'Enchanted', count: 300, visitors: 140},
            {value: 'Epic', count: 210, visitors: 100},
            {value: 'Iconic', count: 90, visitors: 50},
          ],
```

The Populated story then shows every glyph RaritySymbol draws: the five rarities and the three printings. Step 8 checks them in the browser.

Then, from the repo root:

```bash
pnpm exec eslint --max-warnings=0 src/app-bridge.ts src/tools/analytics/web/BreakdownCards.tsx src/tools/analytics/web/WebAnalyticsBody.stories.tsx src/tools/analytics/web/__tests__/WebAnalyticsBody.test.tsx
pnpm typecheck
pnpm vitest run --project scripts scripts/reveal-sync/web.test.mjs
```

Expected:
- **eslint** prints nothing. `src/app-bridge.ts` is the one file `no-restricted-imports` exempts.
- **`pnpm typecheck`** exits 0. Had Step 5 been skipped, it would fail with exactly these errors, and with no other file:
  ```
  src/tools/analytics/web/BreakdownCards.tsx(8,3): error TS2305: Module '"../../../app-bridge"' has no exported member 'enchantedSymbol'.
  src/tools/analytics/web/BreakdownCards.tsx(9,3): error TS2305: Module '"../../../app-bridge"' has no exported member 'epicSymbol'.
  src/tools/analytics/web/BreakdownCards.tsx(10,3): error TS2305: Module '"../../../app-bridge"' has no exported member 'iconicSymbol'.
  ```
  If an error names another file, that file used a webp. Draw it through `RaritySymbol` in the same way, and add it to Step 9.
- **The reveal-sync test** gives `Test Files  1 passed (1)` and `Tests  2 passed (2)`.
  - `web.mjs` loads `src/app-bridge.ts` through Vite's `runnerImport` (`:47`), so this is the bridge's loader test.
  - None of the four reveal-sync contract files (`validateForm.ts`, `buildPreviewCard.ts`, `insertCardIntoPreviewJson.ts`, `constants.ts`) changes, so the rest of `scripts/reveal-sync` doesn't need a run here.

Then confirm that nothing in admin names the webps any more:

```bash
grep -rnE "enchantedSymbol|epicSymbol|iconicSymbol|PRINTING_SYMBOLS|\.webp\?no-inline" src .storybook scripts
```

Expected: no output, and exit 1.

- [ ] **Step 7: Code Health**

Run CodeScene's `code_health_review` on the three changed files it scores:
- `src/tools/analytics/web/BreakdownCards.tsx`;
- `src/tools/analytics/web/__tests__/WebAnalyticsBody.test.tsx`;
- `src/tools/analytics/web/WebAnalyticsBody.stories.tsx`.

Expected: 10.0 for each, with no findings. That is what the sandbox gave with CodeScene MCP 1.5.7. `src/app-bridge.ts` holds only re-exports, so CodeScene gives it no score, at main or after.

If a finding appears, fix it and review again. The likeliest one is Primitive Obsession on `BreakdownCards.tsx`: by hand count it is 2 primitive parameters in 5, both `inkOf`'s, unchanged from main. If that appears, `inkOf` takes `ValueIcon`'s `{prop, value}` object instead. Confirm the fix with `code_health_score`.

- [ ] **Step 8: Check the icons in the browser**

jsdom has no layout and loads no images, so no test sees a broken or missing glyph. #32 asks for this check on /web's "By rarity" breakdown. Use the browser pane, with this session's preview tools:

1. Start Storybook with the preview tool's `admin-storybook` configuration (`.claude/launch.json`), not `pnpm storybook` in a shell.
2. Open `http://localhost:6007/iframe.html?id=admin-insights-web-analytics--populated&viewMode=story`. Reveal card clicks is the busiest event, so its breakdowns show. In "By rarity":
   - each of the eight rows shows a glyph before its name;
   - Enchanted, Epic and Iconic show the printings' gem artwork, the same as the app's /reveals special-printings row.
3. With the browser pane's JavaScript tool, run:
   ```js
   await Promise.all(
     [...document.querySelectorAll('li[title]')]
       .filter((li) => /^(Common|Uncommon|Rare|Super Rare|Legendary|Enchanted|Epic|Iconic):/.test(li.title))
       .map(async (li) => {
         const img = li.querySelector('img');
         const drawn = img ? await img.decode().then(() => true, () => false) : 'no icon';
         return [li.title.split(':')[0], drawn];
       }),
   );
   ```
   Expected: eight pairs, each `true`. `decode()` resolves once the file has loaded and decoded, and rejects for a missing or broken file. The snippet doesn't read `naturalWidth`: the five rarity SVGs have a `viewBox` but no `width` or `height`, so a browser may report 0 for a glyph that draws.
4. **With real data**, if the owner's `public/admin-data/vercel-analytics.json` is present locally (never commit it):
   - Start the dev server with the `admin-dev` configuration, and open `http://localhost:5180/web`.
   - Pick the "Reveal card clicks" event card. Its "By rarity" breakdown names Enchanted, Epic and Iconic.
   - Run the snippet again. Expected: `true` for every rarity row the data holds. The blank row reads "(not set)" and has no icon.
   - Without the snapshot, skip this part and say so in the report.

Afterwards, stop every server you started with the preview tool. A running preview server makes the pre-commit hook's Vitest fail to start its workers.

If no browser is available to the implementer, record each check as pending with the owner, and say so in the report. R4-8 runs it then.

- [ ] **Step 9: Commit**

After the owner approves, with the Bash tool. Stage the files as their own call:

```bash
git add src/app-bridge.ts src/tools/analytics/web/BreakdownCards.tsx src/tools/analytics/web/WebAnalyticsBody.stories.tsx src/tools/analytics/web/__tests__/WebAnalyticsBody.test.tsx
```

Then run CodeScene's `pre_commit_code_health_safeguard` on the staged change (CLAUDE.md), and go on only when it passes. Then commit as a separate call, unpiped:

```bash
USER_APPROVED=1 git commit -m "refactor(analytics): draw the printing symbols through RaritySymbol and drop the bridged webps (#24)" -m "Closes #32."
```

How #32 gets closed:
- The commit body's closing keyword takes effect only when the commit reaches `main`, through R4's merge.
- R4-8's PR body says "Closes #32" as well.
- Closing keywords have failed in this repo before, so R4-8 checks the issue after the merge.

Husky's pre-commit runs the full lint and `test:run`. Never pass `--no-verify`. If Vitest fails to start its workers under load, stop any preview servers, wait for other sessions' runs to finish, and retry.

### Notes for later tasks

- **R4-5c (the pickers).** The rarity picker draws each rarity through `RaritySymbol`, with `rarity={r.toLowerCase()}` or `rarityConfigOf(r)!.key`. It shows `RARITIES` without Enchanted (R-74), and `RARITIES` (`src/tools/reveal/constants.ts:25-32`, a reveal-sync contract file) stays as it is. The bridge no longer has `enchantedSymbol`, and importing it fails typecheck with `TS2305`. The outline's contract addition 1 (`RaritySymbol` "has no Enchanted entry", "shows `enchantedSymbol` as an `<img alt="">`") is void.
- **R4-6c (retire `/reveal` and `/image`).** Its rg sweep can add `enchantedSymbol|epicSymbol|iconicSymbol|PRINTING_SYMBOLS`. Expected: no match.
- **R4-0 (the plan commit), or R4-8 if R4-0 didn't.**
  - In `docs/plans/R-redesign.md`, the bridge record (`:672`, "R1-10 adds … enchantedSymbol, epicSymbol, iconicSymbol") gains: "R4-5h removes `enchantedSymbol`, `epicSymbol` and `iconicSymbol` (R-83, admin#32): `RaritySymbol` draws the printings".
  - The correction "Icons (R1, R3, R4)" (`:114`) drops "(plus the Enchanted webp)".
  - R4-8 checks both lines against the bridge as built.
  - The R4 header's commit table names this task's message `refactor(web): …`. Step 9 uses `refactor(analytics): …`, the scope every `/web` commit so far has used (R1-10's `1c41818`, `9f1b71a`). Align the table with Step 9; R4-8 maps commits by the task files' messages anyway.
- **R4-8 (close R4).**
  - The PR body says "Closes #32" beside the other closing lines. After the merge, confirm that #32 is closed, and close it by hand if it isn't, naming the merge commit.
  - R-87's closing comment for #24 no longer lists #32 among the standalone follow-ups.
  - The app's `CLAUDE.md:225` still lists `src/assets/{enchanted,epic,iconic}.webp` as bridged. That list already misses `DialogShell`, `usePrecomputedSynergies` and `scoreUtils` (R2 and R3), and R4 adds `InkwellIcon`. Fold one correction of the list into the app follow-up that R4-8 drafts (the R-62 issue, or an app docs PR), because admin writes to the app only through the GitHub API.
  - If Step 8 was recorded as pending, run it with the final review's Storybook pass.
