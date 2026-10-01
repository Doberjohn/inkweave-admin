> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

**Contract additions (R1-11)**: the names this task needs, the assumptions it makes about other tasks, and conflicts to settle at assembly.

- **Verdict helper from R1-8.** R1-8 creates `src/tools/analytics/verdict.ts` (`CALIBRATION_BAND`, `SCALE_CLAMP`, `Verdict`, `verdictFor`, `scalePercent`) and points `VerdictHero` at it. R1-11 reads only `verdictFor(meanGap).word`.
- **URL contract.** The URL is `/calibration?rule=<RuleStat.ruleId>`. R1-8's Tune links build it with `` `/calibration?rule=${encodeURIComponent(rule.ruleId)}` ``, and R1-11 reads it. An id the analytics don't have opens on "All pairs".
- **New prop.** `CalibrationView` gains `initialRuleId?: string | null`.
- **Assumed, not renamed:**
  - `NAV_ITEMS` holds R1-6's entry `{id: 'analytics', label: 'Analytics', mark: 'An', path: '/analytics', group: 'insights', writes: false}`. It also holds `overview` (R1-8), `activity` (R1-9), `web` (R1-10), and `tuning`, `reveal` and `image` (R1-6).
  - `PageLayout` renders `title` as the page's only `<h1>` and a string `subtitle` as plain text. `BranchNotice` reads "Writes to Doberjohn/inkweave".
  - The primitives live at `src/ui/Notice.tsx` and `src/ui/format.ts`. `fmtGap` prints U+2212 for negatives, "+" for positives, "0.00" for zero and "—" for null (R1-3).
  - `src/router.test.tsx` is R1-6's rewrite. Its top-level `beforeEach` stubs a `fetch` that never settles, and `src/test/setup.ts` empties the artifact cache before every test (R1-5).
- **Assembly conflicts** (found while checking the other drafts):
  - **R1-12 owns the remaining R1 edits to `CLAUDE.md` and `docs/PLAN.md` (R1-1 and R1-6 make the earlier ones).** That includes the Analytics bullet's "analytics tool shows its 'not generated' state" (its Step 4) and D10, which its Step 8 rewrites to the R1 route table (`/`, `/calibration`, `/activity`, `/web`, the write tools, and `/analytics` → `/`). So this task no longer edits `CLAUDE.md`.
  - **`TabList` goes to R1-12.** Its last user, `AdminAnalyticsDashboard`, is deleted in Step 20. The re-export at `src/app-bridge.ts:44` stays until the owner decides. R1-12 owns `docs/PLAN.md`, which names `TabList` at `:55` and `:110`, so it should ask the owner and record the answer. If the owner drops it:
    - remove the bridge line;
    - update those two PLAN.md lines (§4.2 says the bridge re-exports "exactly what admin uses");
    - the app's `CLAUDE.md:225` list then goes stale, which needs an app PR.
- **Left alone on purpose:** `groupVotesByDay` and the `DayGroup` type in `activityStats.ts`, which R1-9 reuses.

### Task R1-11: Calibration host page and retiring /analytics

**Files:**
- Create: `src/tools/analytics/CalibrationPage.tsx`
- Create: `src/tools/analytics/__tests__/CalibrationPage.test.tsx`
- Modify: `src/tools/analytics/CalibrationView.tsx`:
  - the bridge import, line 2
  - the props interface, lines 15–18
  - `formatHeaderLine`, lines 47–52
  - the docblock and state, lines 89–97
- Modify: `src/tools/analytics/RuleCalibrationTable.tsx`:
  - the bridge import, line 2
  - `formatGap`, lines 19–23
  - the gap cell, line 139
- Modify: `src/tools/analytics/VerdictHero.tsx`:
  - the bridge import, line 1
  - the accuracy value and the hero number, today lines 82 and 128 (R1-8 moves both up)
- Modify: `src/tools/analytics/WeeklyActivityChart.tsx` (line 1 and line 41)
- Modify: `src/tools/analytics/CalibrationView.stories.tsx` (append after line 88)
- Modify: `src/tools/analytics/__tests__/CalibrationView.test.tsx` (inside the `describe`, after line 48)
- Modify: `src/shell/nav.ts` (the `analytics` entry of `NAV_ITEMS`)
- Modify: `src/shell/nav.test.ts` (append a `describe`, plus Step 13's hits)
- Modify: the shell's other tests and stories that name the old item: at the time of writing, R1-6's `src/shell/Sidebar.test.tsx` and `src/shell/Sidebar.stories.tsx`. Step 13 finds them.
- Modify: `src/router.tsx` (imports and the `analytics` route)
- Modify: `src/router.test.tsx` (Step 13's hits, imports, and an appended `describe`)
- Modify: `src/shell/AdminShell.tsx` (the main column's comment, if it still names `AnalyticsPage`)
- Delete:
  - `src/tools/analytics/AnalyticsPage.tsx` and `AnalyticsPage.stories.tsx`
  - `src/tools/analytics/AdminAnalyticsDashboard.tsx`
  - `src/tools/analytics/ActivityView.tsx`, `ActivityView.stories.tsx` and `__tests__/ActivityView.test.tsx`
  - `src/tools/analytics/DayGroup.tsx`, `DayGroup.stories.tsx` and `__tests__/DayGroup.test.tsx`
  - `src/tools/analytics/WebAnalyticsView.tsx`, `WebAnalyticsView.stories.tsx` and `__tests__/WebAnalyticsView.test.tsx`

  These are the old files directly under `src/tools/analytics/`. R1-9's `src/tools/analytics/activity/ActivityView.tsx` and its test stay.

**Interfaces:**
- Consumes:
  - `PageLayout` (`src/shell/PageLayout.tsx`)
  - `Notice` (`src/ui/Notice.tsx`)
  - `fmtGap`, `fmtInt` (`src/ui/format.ts`)
  - `verdictFor` (`src/tools/analytics/verdict.ts`, R1-8)
  - `useVoteAnalytics`, `useVoteLog` and `fetchAdminData`, with the per-session cache from R-8, which `src/test/setup.ts` empties before every test (R1-5). `router.test.tsx`'s top-level `beforeEach` comes from R1-6.
  - `NAV_ITEMS`, `navItemFor`, `isWritePath` (`src/shell/nav.ts`), and R1-6's shell tests and stories
  - `src/ui/Sparkline.tsx` (R1-3) and the web page's no-Vercel-data copy (R1-10). Both must exist before the old files are deleted.
- Produces:
  - `CalibrationPage`, the route at `/calibration`
  - `CalibrationView`'s `initialRuleId` prop
  - The `/calibration?rule=<ruleId>` deep link
  - The redirect `/analytics` → `/` (replace)
  - The nav item `{id: 'calibration', label: 'Calibration & tuning', mark: 'Ca', path: '/calibration', group: 'insights', writes: false}`, first in Insights
  - Every gap the hosted calibration view prints goes through `fmtGap`

`pnpm vitest run <file>` assumes the engine is already built (earlier tasks build it). On a fresh clone, run `pnpm build:engine` once first. Every code block below passed `pnpm exec eslint --stdin --stdin-filename <its path>` during planning.

- [ ] **Step 1: Write the failing `CalibrationView` tests**

In `src/tools/analytics/__tests__/CalibrationView.test.tsx`, add these three tests inside `describe('CalibrationView', …)`, after the existing test (between line 48 `  });` and line 49 `});`):

```tsx

  it('opens with initialRuleId selected', () => {
    render(
      <CalibrationView analytics={ANALYTICS} voteLog={{generatedAt: '', votes: [], voterCount: 0}} initialRuleId="ramp" />,
    );
    expect(screen.getByRole('button', {name: /Ramp/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/^Ramp · gap/)).toBeInTheDocument();
  });

  it('opens on all pairs when initialRuleId names a rule the analytics lack', () => {
    const pair = {a: 'c1', b: 'c2', aName: 'Maui', bName: 'Fishhook', engineScore: 8, communityScore: 5, gap: -3, scoreVotes: 12, rules: ['ramp']};
    render(
      <CalibrationView
        analytics={{...ANALYTICS, pairs: [pair]}}
        voteLog={{generatedAt: '', votes: [], voterCount: 0}}
        initialRuleId="retired-rule"
      />,
    );
    expect(screen.getByRole('button', {name: /Ramp/})).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('All pairs')).toBeInTheDocument();
    // A stale id must not scope the list to a rule nobody has: every pair still shows.
    expect(screen.getByRole('button', {name: /Maui/})).toBeInTheDocument();
  });

  it('signs every gap with a true minus (U+2212)', async () => {
    const analytics: VoteAnalytics = {
      ...ANALYTICS,
      hasRawVotes: true,
      global: {...ANALYTICS.global, accuracySentiment: -0.12, weekly: [{week: '2026-09-28', votes: 3, meanGap: -0.4}]},
    };
    render(<CalibrationView analytics={analytics} voteLog={{generatedAt: '', votes: [], voterCount: 0}} />);
    // The hero's mean gap and the Ramp row's gap, both −0.4.
    expect(screen.getAllByText('−0.40')).toHaveLength(2);
    expect(screen.getByText('−0.12')).toBeInTheDocument();
    expect(screen.getByTitle('Week of Sep 28: 3 votes, gap −0.40')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: /Ramp/}));
    expect(screen.getByText('Ramp · gap −0.40 · 3 votes')).toBeInTheDocument();
  });
```

Every `−` in these strings is U+2212.

- [ ] **Step 2: Run the tests and see two fail**

Run: `pnpm vitest run src/tools/analytics/__tests__/CalibrationView.test.tsx`

Expected: two failures.
- `opens with initialRuleId selected`:
  ```
  Expected the element to have attribute:
    aria-pressed="true"
  Received:
    aria-pressed="false"
  ```
- `signs every gap with a true minus (U+2212)`: `Unable to find an element with the text: −0.40`. Today's views print an ASCII hyphen.

`opens on all pairs when initialRuleId names a rule the analytics lack` already passes, because the prop is still ignored. A naive `useState(initialRuleId)` would fail it on the missing Maui row.

- [ ] **Step 3: Add the `initialRuleId` prop to `CalibrationView`**

In `src/tools/analytics/CalibrationView.tsx`, replace lines 15–18:

```tsx
interface CalibrationViewProps {
  analytics: VoteAnalytics;
  voteLog: VoteLog;
}
```

with:

```tsx
interface CalibrationViewProps {
  analytics: VoteAnalytics;
  voteLog: VoteLog;
  /**
   * The rule to open with selected (/calibration?rule=<ruleId>, from the
   * Overview's Tune links). An id the analytics don't have, such as a stale
   * link to a retired rule, opens on all pairs instead.
   */
  initialRuleId?: string | null;
}
```

Then replace lines 89–97:

```tsx
/**
 * The Calibration tab body: a verdict hero, a stat strip, a two-column
 * rule → pair → vote drill-down, and a raw-votes activity strip. Purely
 * presentational — all selection lives in local state, and the data comes in
 * via props (fetched by the page).
 */
export function CalibrationView({analytics, voteLog}: CalibrationViewProps) {
  const g = analytics.global;
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
```

with:

```tsx
/**
 * The Calibration page body: a verdict hero, a stat strip, a two-column
 * rule → pair → vote drill-down, and a raw-votes activity strip. Purely
 * presentational — all selection lives in local state (the rule starts from
 * initialRuleId), and the data comes in via props (fetched by the page).
 */
export function CalibrationView({analytics, voteLog, initialRuleId = null}: CalibrationViewProps) {
  const g = analytics.global;
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(() =>
    analytics.rules.some((r) => r.ruleId === initialRuleId) ? initialRuleId : null,
  );
```

`handleSelectRule` still toggles from whatever the initial selection was, so clicking the pre-selected row returns to "All pairs".

- [ ] **Step 4: Print the hosted view's gaps through `fmtGap`**

The new page header prints "Mean gap −0.30" (Step 10). Without this step, the view under it would print "-0.30" in the hero, the rule table and the right-column header. These four files are the hosted view's only signed numbers.

In `src/tools/analytics/CalibrationView.tsx`, replace line 2:

```tsx
import {COLORS, FONT_SIZES, SPACING, useContainerWidth} from '../../app-bridge';
```

with:

```tsx
import {COLORS, FONT_SIZES, SPACING, useContainerWidth} from '../../app-bridge';
import {fmtGap} from '../../ui/format';
```

and replace `formatHeaderLine` (lines 47–52):

```tsx
/** Right-column header: the selected rule's name + gap + votes, or "All pairs". */
function formatHeaderLine(rule: RuleStat | null): string {
  if (!rule) return 'All pairs';
  const gap = rule.meanGap == null ? '—' : (rule.meanGap > 0 ? '+' : '') + rule.meanGap.toFixed(2);
  return `${rule.ruleName} · gap ${gap} · ${num(rule.scoreVotes)} votes`;
}
```

with:

```tsx
/** Right-column header: the selected rule's name + gap + votes, or "All pairs". */
function formatHeaderLine(rule: RuleStat | null): string {
  if (!rule) return 'All pairs';
  return `${rule.ruleName} · gap ${fmtGap(rule.meanGap)} · ${num(rule.scoreVotes)} votes`;
}
```

In `src/tools/analytics/RuleCalibrationTable.tsx`, replace line 2:

```tsx
import {CAP_LABEL_XS, COLORS, FONTS, FONT_SIZES, LETTER_SPACING, LinkButton, RADIUS, SPACING} from '../../app-bridge';
```

with:

```tsx
import {CAP_LABEL_XS, COLORS, FONTS, FONT_SIZES, LETTER_SPACING, LinkButton, RADIUS, SPACING} from '../../app-bridge';
import {fmtGap} from '../../ui/format';
```

Delete lines 19–23, including the blank line after the function:

```tsx
function formatGap(meanGap: number | null): string {
  if (meanGap == null) return '—';
  return (meanGap > 0 ? '+' : '') + meanGap.toFixed(2);
}

```

and in `RuleRow` (line 139) replace:

```tsx
      <td style={{...NUMERIC_CELL, color: gapColor(rule.meanGap)}}>{formatGap(rule.meanGap)}</td>
```

with:

```tsx
      <td style={{...NUMERIC_CELL, color: gapColor(rule.meanGap)}}>{fmtGap(rule.meanGap)}</td>
```

In `src/tools/analytics/VerdictHero.tsx`, replace the first two lines (R1-8 leaves both as they are and adds its `./verdict` import after them):

```tsx
import {CAP_LABEL_XS, COLORS, FONTS, FONT_SIZES, LETTER_SPACING, RADIUS, SPACING} from '../../app-bridge';
import {biasCopy} from './biasCopy';
```

with:

```tsx
import {CAP_LABEL_XS, COLORS, FONTS, FONT_SIZES, LETTER_SPACING, RADIUS, SPACING} from '../../app-bridge';
import {fmtGap} from '../../ui/format';
import {biasCopy} from './biasCopy';
```

In `AccuracyColumn` (today line 82), replace:

```tsx
        {accuracySentiment == null ? '—' : (accuracySentiment > 0 ? '+' : '') + accuracySentiment.toFixed(2)}
```

with:

```tsx
        {fmtGap(accuracySentiment)}
```

and in `VerdictHero`'s hero number (today line 128) replace:

```tsx
          {meanGap == null ? '—' : meanGap.toFixed(2)}
```

with:

```tsx
          {fmtGap(meanGap)}
```

The hero now also prints "+" before a positive gap, as the Overview's calibration card does.

In `src/tools/analytics/WeeklyActivityChart.tsx`, replace line 1:

```tsx
import {COLORS, FONT_SIZES, RADIUS, SPACING} from '../../app-bridge';
```

with:

```tsx
import {COLORS, FONT_SIZES, RADIUS, SPACING} from '../../app-bridge';
import {fmtGap} from '../../ui/format';
```

and on line 41 replace:

```tsx
            title={`Week of ${shortDate(w.week)}: ${w.votes} votes${w.meanGap == null ? '' : `, gap ${w.meanGap.toFixed(2)}`}`}
```

with:

```tsx
            title={`Week of ${shortDate(w.week)}: ${w.votes} votes${w.meanGap == null ? '' : `, gap ${fmtGap(w.meanGap)}`}`}
```

- [ ] **Step 5: Add a story for the deep-linked state**

In `src/tools/analytics/CalibrationView.stories.tsx`, append after line 88 (`export const NoRawVotes…`):

```tsx

// What the Overview's Tune link opens: /calibration?rule=ramp.
export const RuleSelected: Story = {args: {analytics: WITH_DATA, voteLog: VOTE_LOG, initialRuleId: 'ramp'}};
```

- [ ] **Step 6: Run the tests again, then lint and typecheck**

Run: `pnpm vitest run src/tools/analytics`
Expected: PASS. `CalibrationView.test.tsx` has 4 tests. `RuleCalibrationTable.test.tsx` and `VerdictHero.test.tsx` still pass, because neither asserts a gap string.

Run: `pnpm lint`, then `pnpm typecheck`
Expected: both finish with no errors.

- [ ] **Step 7: Commit**

Run with the Bash tool, only after the owner approves:
```bash
git add src/tools/analytics/CalibrationView.tsx src/tools/analytics/CalibrationView.stories.tsx src/tools/analytics/__tests__/CalibrationView.test.tsx src/tools/analytics/RuleCalibrationTable.tsx src/tools/analytics/VerdictHero.tsx src/tools/analytics/WeeklyActivityChart.tsx
USER_APPROVED=1 git commit -m "feat(analytics): open CalibrationView on a rule and sign its gaps with a true minus (#24)"
```

- [ ] **Step 8: Write the failing `CalibrationPage` tests**

Create `src/tools/analytics/__tests__/CalibrationPage.test.tsx`:

```tsx
import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CalibrationPage} from '../CalibrationPage';
import type {VoteAnalytics} from '../voteAnalyticsTypes';

const ANALYTICS: VoteAnalytics = {
  generatedAt: '2026-06-30T04:12:00Z',
  hasRawVotes: false,
  global: {
    totalVotes: 2054,
    distinctPairs: 1928,
    distinctVoters: null,
    meanGap: -0.3,
    accuracySentiment: null,
    engineSilentPairs: 196,
    weekly: [],
    dimensionFill: null,
  },
  rules: [
    {
      ruleId: 'ramp',
      ruleName: 'Ramp',
      category: 'playstyle',
      scoreVotes: 557,
      pairsVoted: 279,
      meanGap: -0.57,
      accuracySentiment: null,
      pairsCovered: 1671,
    },
  ],
  pairs: [],
};

const json = (body: unknown) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});

/** Answer /admin-data/<file> from `files`. Anything else (another artifact) never settles. */
function serve(files: Record<string, () => Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const respond = files[url.replace('/admin-data/', '')];
      return respond ? Promise.resolve(respond()) : new Promise<Response>(() => {});
    }),
  );
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <CalibrationPage />
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('CalibrationPage', () => {
  it('shows a loading notice under the page title until the analytics arrive', () => {
    serve({});
    renderAt('/calibration');
    expect(screen.getByRole('heading', {level: 1, name: 'Calibration & tuning'})).toBeInTheDocument();
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('sums up the calibration and dates the data in the header', async () => {
    serve({'vote-analytics.json': () => json(ANALYTICS)});
    renderAt('/calibration');
    expect(await screen.findByText('Mean gap −0.30 · well-calibrated · 2,054 votes')).toBeInTheDocument();
    expect(screen.getByText('2026-06-30')).toBeInTheDocument();
    expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument();
    // No raw votes to wait for: the pending vote log goes unmentioned.
    expect(screen.queryByText('Loading the raw votes...')).not.toBeInTheDocument();
  });

  it('names the lean when the gap leaves the calibrated band', async () => {
    serve({'vote-analytics.json': () => json({...ANALYTICS, global: {...ANALYTICS.global, meanGap: -0.8}})});
    renderAt('/calibration');
    expect(await screen.findByText('Mean gap −0.80 · runs generous · 2,054 votes')).toBeInTheDocument();
  });

  it.each([
    ['is missing', () => new Response('', {status: 404}), 'vote-analytics.json: HTTP 404'],
    [
      'was never generated',
      () => new Response('<!doctype html>', {headers: {'content-type': 'text/html'}}),
      'vote-analytics.json has not been generated yet',
    ],
  ])('says so when the artifact %s', async (_, respond, reason) => {
    serve({'vote-analytics.json': respond});
    renderAt('/calibration');
    expect(
      await screen.findByText(`Could not load vote analytics. Has the artifact been generated? (${reason})`),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument();
  });

  it('opens with the rule from ?rule= selected', async () => {
    serve({'vote-analytics.json': () => json(ANALYTICS)});
    renderAt('/calibration?rule=ramp');
    expect(await screen.findByRole('button', {name: /Ramp/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('All pairs')).not.toBeInTheDocument();
  });

  it('says the raw votes are still loading when the analytics have them', async () => {
    // vote-log.json never settles here, so a selected pair would show no votes yet.
    serve({'vote-analytics.json': () => json({...ANALYTICS, hasRawVotes: true})});
    renderAt('/calibration');
    expect(await screen.findByText('Loading the raw votes...')).toBeInTheDocument();
  });

  it('flags a vote log that failed to load when the analytics have raw votes', async () => {
    serve({
      'vote-analytics.json': () => json({...ANALYTICS, hasRawVotes: true}),
      'vote-log.json': () => new Response('', {status: 500}),
    });
    renderAt('/calibration');
    expect(await screen.findByText(/Could not load the raw votes/)).toHaveTextContent('(vote-log.json: HTTP 500)');
    expect(screen.queryByText('Loading the raw votes...')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run the tests and see them fail**

Run: `pnpm vitest run src/tools/analytics/__tests__/CalibrationPage.test.tsx`

Expected: FAIL, because the page doesn't exist yet:
```
Error: Failed to resolve import "../CalibrationPage" from "src/tools/analytics/__tests__/CalibrationPage.test.tsx". Does the file exist?
```

- [ ] **Step 10: Create `CalibrationPage`**

Create `src/tools/analytics/CalibrationPage.tsx`:

```tsx
import {useSearchParams} from 'react-router-dom';
import {PageLayout} from '../../shell/PageLayout';
import {fmtGap, fmtInt} from '../../ui/format';
import {Notice} from '../../ui/Notice';
import {CalibrationView} from './CalibrationView';
import {useVoteAnalytics} from './useVoteAnalytics';
import {useVoteLog} from './useVoteLog';
import {verdictFor} from './verdict';
import type {VoteAnalytics} from './voteAnalyticsTypes';
import type {VoteLog} from './voteLogTypes';

/** Rendered while the vote log is still loading (or failed), so CalibrationView always receives a VoteLog. */
const EMPTY_VOTE_LOG: VoteLog = {generatedAt: '', votes: [], voterCount: 0};

/** The header summary, e.g. "Mean gap −0.30 · well-calibrated · 2,054 votes". */
function summaryLine({global: g}: VoteAnalytics): string {
  return `Mean gap ${fmtGap(g.meanGap)} · ${verdictFor(g.meanGap).word} · ${fmtInt(g.totalVotes)} votes`;
}

/**
 * Calibration & tuning (/calibration). In R1 it hosts today's CalibrationView
 * under the shared page header and writes nothing, so it has no token gate and
 * no branch notice; R2 adds the tuning aside and both with it (R-4).
 * `?rule=<ruleId>`, which the Overview's Tune links carry, opens the page with
 * that rule selected.
 */
export function CalibrationPage() {
  const {data: analytics, loading, error} = useVoteAnalytics();
  const {data: voteLog, loading: voteLogLoading, error: voteLogError} = useVoteLog();
  const [searchParams] = useSearchParams();
  const ruleId = searchParams.get('rule');

  return (
    <PageLayout
      title="Calibration & tuning"
      subtitle={analytics ? summaryLine(analytics) : undefined}
      meta={
        analytics ? (
          <>
            Data as of <code>{analytics.generatedAt.slice(0, 10)}</code>
          </>
        ) : undefined
      }>
      {loading && <Notice>Loading analytics...</Notice>}
      {error && (
        <Notice tone="error">
          Could not load vote analytics. Has the artifact been generated? ({error.message})
        </Notice>
      )}
      {/* The raw votes matter only when the analytics say there are some: without
          them every pair's vote table is empty anyway. Until they arrive, or if
          they fail, a selected pair shows no votes, so say why. */}
      {analytics?.hasRawVotes && voteLogLoading && <Notice>Loading the raw votes...</Notice>}
      {analytics?.hasRawVotes && voteLogError && (
        <Notice tone="error">
          Could not load the raw votes, so a pair&apos;s votes won&apos;t show ({voteLogError.message}).
        </Notice>
      )}
      {analytics && (
        // The key remounts the view when ?rule= changes, so the selection follows
        // the URL: a Tune link sets the rule, the sidebar link clears it.
        <CalibrationView
          key={ruleId ?? ''}
          analytics={analytics}
          voteLog={voteLog ?? EMPTY_VOTE_LOG}
          initialRuleId={ruleId}
        />
      )}
    </PageLayout>
  );
}
```

The analytics loading and error copy is `AnalyticsPage`'s, unchanged. "Not generated" goes through the error branch: when the SPA fallback answers instead, `fetchAdminData` rejects with `vote-analytics.json has not been generated yet`, so the notice names the cause. The two raw-votes notices are new (review finding `vote-log-states`). The old page passed an empty log and said nothing.

- [ ] **Step 11: Run the tests again, then lint and typecheck**

Run: `pnpm vitest run src/tools/analytics/__tests__/CalibrationPage.test.tsx`
Expected: PASS (8 tests).

Run: `pnpm lint`, then `pnpm typecheck`
Expected: both finish with no errors. Until Step 16, nothing imports the page.

- [ ] **Step 12: Commit**

Run with the Bash tool, only after the owner approves:
```bash
git add src/tools/analytics/CalibrationPage.tsx src/tools/analytics/__tests__/CalibrationPage.test.tsx
USER_APPROVED=1 git commit -m "feat(analytics): add the Calibration & tuning page (#24)"
```

- [ ] **Step 13: Write the failing route and nav tests, and point the shell's tests and stories at the new item**

First, list everything in the shell and the route tests that still names the old item:

```bash
git grep -n -E "[\"']analytics[\"']|/analytics([^/[:alnum:]_-]|$)|[^[:alnum:] ]Analytics[^[:alnum:] ]" -- src/shell src/router.test.tsx
```

The pattern catches the id, the path and the quoted label. It skips `tools/analytics/…` import paths and prose such as "Vercel Analytics". Change every hit by this table:

| Hit | Change |
|---|---|
| A test that opens the old page and looks for its `Engine Calibration` h1, such as `it('opens analytics at /analytics', …)` | Delete the whole test. The `calibration routes` block below covers `/calibration`. |
| `'/analytics'` or `'/analytics/…'` used as a page to open, a path to classify, or a story's route | `'/calibration'` (also read-only in R1), e.g. `['/analytics/anything', 'analytics']` → `['/calibration/anything', 'calibration']` |
| The id `'analytics'` | `'calibration'` |
| The label `'Analytics'`, as a link's name or `title` | `'Calibration & tuning'` |
| An expected href list such as `['/analytics', '/activity', '/web']` | The same list with `'/calibration'` in place of `'/analytics'` |

In R1-6's draft the hits sit in four files:
- `src/shell/nav.test.ts`: the `navItemFor` and `isWritePath` cases
- `src/shell/Sidebar.test.tsx`: the default `path`, the Insights hrefs and the read-only token-box case
- `src/shell/Sidebar.stories.tsx`: `parameters.route ?? '/analytics'`
- `src/router.test.tsx`: the sidebar, current-link, no-branch and collapse cases

Run the grep again. Expected: no output.

Next, append this block to the end of `src/shell/nav.test.ts`. The file uses Vitest globals and already imports `NAV_ITEMS`, `isWritePath` and `navItemFor` from `./nav`:

```ts

describe('the Calibration & tuning item', () => {
  it('heads Insights, where the analytics page was', () => {
    const insights = NAV_ITEMS.filter((item) => item.group === 'insights').map((item) => item.id);
    expect(insights).toEqual(['calibration', 'activity', 'web']);
    expect(NAV_ITEMS.some((item) => item.id === 'analytics')).toBe(false);
  });

  it('owns /calibration, and writes nothing in R1', () => {
    expect(navItemFor('/calibration')).toMatchObject({id: 'calibration', label: 'Calibration & tuning', mark: 'Ca'});
    // Tuning moves in, and the page starts writing, in R2 (R-4).
    expect(isWritePath('/calibration')).toBe(false);
  });
});
```

Then, in `src/router.test.tsx`, add `waitFor` to the `@testing-library/react` import. In R1-6's version, replace:

```tsx
import {render, screen, within} from '@testing-library/react';
```

with:

```tsx
import {render, screen, waitFor, within} from '@testing-library/react';
```

If an earlier task already added other names there, keep them and add `waitFor`. The file already imports `userEvent`, `createMemoryRouter`, `RouterProvider` and `routes`. Add this after its last import:

```tsx
import type {VoteAnalytics} from './tools/analytics/voteAnalyticsTypes';
```

Then append this block at the end of the file:

```tsx

describe('calibration routes', () => {
  const ANALYTICS: VoteAnalytics = {
    generatedAt: '2026-06-30T04:12:00Z',
    hasRawVotes: false,
    global: {
      totalVotes: 2054,
      distinctPairs: 1928,
      distinctVoters: null,
      meanGap: -0.3,
      accuracySentiment: null,
      engineSilentPairs: 196,
      weekly: [],
      dimensionFill: null,
    },
    rules: [
      {
        ruleId: 'ramp',
        ruleName: 'Ramp',
        category: 'playstyle',
        scoreVotes: 557,
        pairsVoted: 279,
        meanGap: -0.57,
        accuracySentiment: null,
        pairsCovered: 1671,
      },
    ],
    pairs: [],
  };

  /** Render the routes at `path` and hand back the router, so a test can read where it ended up. */
  function routerAt(path: string) {
    const router = createMemoryRouter(routes, {initialEntries: [path]});
    render(<RouterProvider router={router} />);
    return router;
  }

  beforeEach(() => {
    // src/test/setup.ts has already emptied the artifact cache (R1-5), and the
    // file's beforeEach stubbed a fetch that never settles. This one answers
    // vote-analytics.json and leaves everything else (the card data, the vote
    // log) pending.
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url === '/admin-data/vote-analytics.json'
          ? Promise.resolve(new Response(JSON.stringify(ANALYTICS), {headers: {'content-type': 'application/json'}}))
          : new Promise<Response>(() => {}),
      ),
    );
  });

  it('redirects the retired /analytics to the Overview', async () => {
    const router = routerAt('/analytics');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    // Replaced, not pushed: Back doesn't land on the redirect again.
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('opens Calibration & tuning at /calibration, without a branch notice', async () => {
    routerAt('/calibration');
    expect(screen.getByRole('heading', {level: 1, name: 'Calibration & tuning'})).toBeInTheDocument();
    expect(await screen.findByText('All pairs')).toBeInTheDocument();
    expect(screen.queryByText('Writes to Doberjohn/inkweave')).not.toBeInTheDocument();
  });

  it('opens with the rule from ?rule= selected', async () => {
    routerAt('/calibration?rule=ramp');
    expect(await screen.findByRole('button', {name: /Ramp/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('All pairs')).not.toBeInTheDocument();
  });

  it('clears that selection when the sidebar link drops ?rule=', async () => {
    const router = routerAt('/calibration?rule=ramp');
    await screen.findByRole('button', {name: /Ramp/, pressed: true});

    await userEvent.click(screen.getByRole('link', {name: 'Calibration & tuning'}));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(await screen.findByRole('button', {name: /Ramp/, pressed: false})).toBeInTheDocument();
    expect(screen.getByText('All pairs')).toBeInTheDocument();
  });
});
```

- [ ] **Step 14: Run the shell and route tests and see the new ones fail**

Run: `pnpm vitest run src/router.test.tsx src/shell`

Expected: what this task added or changed fails, and every other test passes. `/calibration` still renders `NotFound`, `/analytics` still renders the old page, and the nav still has `analytics`:
- In `nav.test.ts`:
  - `heads Insights…` fails with `expected [ 'analytics', 'activity', 'web' ] to deeply equal [ 'calibration', 'activity', 'web' ]`.
  - `owns /calibration…` fails, because `navItemFor('/calibration')` is `undefined`.
  - The `/calibration/anything` case fails with `expected undefined to be 'calibration'`.
- In `Sidebar.test.tsx`, the Insights href list fails on `'/analytics'` vs `'/calibration'`.
- In `router.test.tsx`:
  - `redirects the retired /analytics…` fails with `expected '/analytics' to be '/'`, after `waitFor` times out.
  - `opens Calibration & tuning at /calibration…` fails with `Unable to find an accessible element with the role "heading" and name "Calibration & tuning"`.
  - The two `?rule=` tests fail with `Unable to find role="button" and name "/Ramp/"`.
  - Every test you pointed at the new link fails with `Unable to find role="link" and name "Calibration & tuning"`.

- [ ] **Step 15: Swap the nav item**

In `src/shell/nav.ts`, replace R1-6's entry for the old page, which sits directly above the `activity` entry:

```ts
  {id: 'analytics', label: 'Analytics', mark: 'An', path: '/analytics', group: 'insights', writes: false},
```

with:

```ts
  // Read-only in R1. Tuning moves in with R2, which turns writes on (R-4).
  {id: 'calibration', label: 'Calibration & tuning', mark: 'Ca', path: '/calibration', group: 'insights', writes: false},
```

By id, `NAV_ITEMS` now reads: overview; calibration, activity, web; tuning, reveal, image.

- [ ] **Step 16: Route `/calibration` and redirect `/analytics`**

In `src/router.tsx`, add `Navigate` back to the react-router import. R1-8's Step 34 dropped it along with the index redirect, so the line reads:

```tsx
import {createBrowserRouter, type RouteObject} from 'react-router-dom';
```

Replace it with:

```tsx
import {createBrowserRouter, Navigate, type RouteObject} from 'react-router-dom';
```

Then replace:

```tsx
import {AnalyticsPage} from './tools/analytics/AnalyticsPage';
```

with:

```tsx
import {CalibrationPage} from './tools/analytics/CalibrationPage';
```

And replace the route:

```tsx
      {path: 'analytics', element: <AnalyticsPage />},
```

with:

```tsx
      {path: 'calibration', element: <CalibrationPage />},
      // The old analytics page split into the insights pages; a bookmark lands on the Overview (R-10).
      {path: 'analytics', element: <Navigate to="/" replace />},
```

- [ ] **Step 17: Run the whole suite, check for leftovers, then lint and typecheck**

Run: `pnpm test:run`
Expected: PASS. The shell's tests, its stories' tests and `router.test.tsx` are all green. The old analytics tests (`ActivityView`, `DayGroup`, `WebAnalyticsView`) still pass, because their files are only deleted in Step 20.

Run:

```bash
git grep -n -E "[\"']analytics[\"']|/analytics([^/[:alnum:]_-]|$)|[^[:alnum:] ]Analytics[^[:alnum:] ]" -- src
```

Expected, in any order:
```
src/router.test.tsx:<n>:  it('redirects the retired /analytics to the Overview', async () => {
src/router.test.tsx:<n>:    const router = routerAt('/analytics');
src/router.tsx:<n>:      {path: 'analytics', element: <Navigate to="/" replace />},
src/shell/nav.test.ts:<n>:    expect(NAV_ITEMS.some((item) => item.id === 'analytics')).toBe(false);
```
Any other line is a link, test or story still aimed at the old page. Point it at `/calibration`, or at `/` for a link meant for the Overview.

Run: `pnpm lint`, then `pnpm typecheck`
Expected: both finish with no errors.

- [ ] **Step 18: Commit**

Run `git status --short`. Expected: only modified files are listed:
- `src/router.tsx` and `src/router.test.tsx`
- `src/shell/nav.ts` and `src/shell/nav.test.ts`
- the shell tests and story that Step 13 changed

Then run with the Bash tool, only after the owner approves:
```bash
git add src/router.tsx src/router.test.tsx src/shell/
USER_APPROVED=1 git commit -m "feat(shell): route /calibration and redirect /analytics to the Overview (#24)"
```

- [ ] **Step 19: Check that nothing the old page carried is lost, and that nothing still uses it**

First, check that the pieces moved out of `WebAnalyticsView` exist in their new homes:

```bash
git grep -n "export function Sparkline" -- src/ui
git grep -l "VERCEL_ANALYTICS_TOKEN" -- src/tools/analytics/web
```

Expected:
- The first prints `src/ui/Sparkline.tsx:<n>:export function Sparkline(…`, moved in R1-3.
- The second prints at least one file under `src/tools/analytics/web/`, R1-10's no-Vercel-data copy (`WebAnalyticsBody.tsx` in its draft; its test may add another).

If either prints nothing, stop. The task that moves it hasn't landed, and deleting `WebAnalyticsView.tsx` now would lose it.

Then check that nothing outside the files being deleted imports the old page modules:

```bash
git grep -n -E "from '[^']*/(AnalyticsPage|AdminAnalyticsDashboard|WebAnalyticsView)'" -- src .storybook ':!src/tools/analytics/AnalyticsPage.tsx' ':!src/tools/analytics/AnalyticsPage.stories.tsx' ':!src/tools/analytics/AdminAnalyticsDashboard.tsx' ':!src/tools/analytics/WebAnalyticsView.tsx' ':!src/tools/analytics/WebAnalyticsView.stories.tsx' ':!src/tools/analytics/__tests__/WebAnalyticsView.test.tsx'
```

Expected: no output. Before Step 16, the one match was `src/router.tsx:<n>:import {AnalyticsPage} from './tools/analytics/AnalyticsPage';`.

`ActivityView` and `DayGroup` are left out on purpose. R1-9's own `activity/ActivityView.tsx` shares the name and the `'./ActivityView'` specifier, and `DayGroup` is also a type in `activityStats.ts`. The old components' only importers are `AdminAnalyticsDashboard` and the old `ActivityView`, which go in the same step. `pnpm typecheck` in Step 21 catches any other importer.

Last, find comments that still name the old modules:

```bash
git grep -n -w -E "AnalyticsPage|AdminAnalyticsDashboard|WebAnalyticsView" -- src .storybook ':!src/tools/analytics/AnalyticsPage.tsx' ':!src/tools/analytics/AnalyticsPage.stories.tsx' ':!src/tools/analytics/AdminAnalyticsDashboard.tsx' ':!src/tools/analytics/WebAnalyticsView.tsx' ':!src/tools/analytics/WebAnalyticsView.stories.tsx' ':!src/tools/analytics/__tests__/WebAnalyticsView.test.tsx'
```

`-w` keeps `WebAnalyticsPage` out. Expected: comments only. A comment that records where code came from can stay, in the past tense ("moved from WebAnalyticsView"). R1-3's `Sparkline` and R1-8's fixtures have such notes. A comment that speaks of an old file as a live page gets reworded. In R1-6's draft that is `src/shell/AdminShell.tsx`'s `(AnalyticsPage)`, which Step 20 handles.

- [ ] **Step 20: Delete the old analytics page and its tab views**

```bash
git rm src/tools/analytics/AnalyticsPage.tsx src/tools/analytics/AnalyticsPage.stories.tsx src/tools/analytics/AdminAnalyticsDashboard.tsx src/tools/analytics/ActivityView.tsx src/tools/analytics/ActivityView.stories.tsx src/tools/analytics/__tests__/ActivityView.test.tsx src/tools/analytics/DayGroup.tsx src/tools/analytics/DayGroup.stories.tsx src/tools/analytics/__tests__/DayGroup.test.tsx src/tools/analytics/WebAnalyticsView.tsx src/tools/analytics/WebAnalyticsView.stories.tsx src/tools/analytics/__tests__/WebAnalyticsView.test.tsx
```

Expected: 12 `rm '…'` lines. These files stay, because `CalibrationView` uses them until R2: `Scorecard`, `WeeklyActivityChart`, `VerdictHero`, `RawVotesNotice`, `RuleCalibrationTable`, `PairList`, `VoteDetailTable` and `DimensionParticipation`.

With the old page gone, no route renders outside `PageLayout` for the reason the shell's comment gives. In `src/shell/AdminShell.tsx`, if the main column's comment still reads:

```tsx
          {/* PageLayout fills this column and scrolls its own body. A page that
              isn't in PageLayout yet (AnalyticsPage) scrolls the column. */}
```

replace it with:

```tsx
          {/* PageLayout fills this column and scrolls its own body. A page
              outside it scrolls the column. */}
```

If an earlier task already reworded it so that it no longer names `AnalyticsPage`, leave it.

- [ ] **Step 21: Verify the whole repo**

Run the import check from Step 19 again, without the exclusions:

```bash
git grep -n -E "from '[^']*/(AnalyticsPage|AdminAnalyticsDashboard|WebAnalyticsView)'" -- src .storybook
```

Expected: no output.

Then run `pnpm lint`, `pnpm typecheck`, `pnpm test:run` and `pnpm build`.

Expected: all four finish with no errors, and Vitest reports no failed tests. The suite has three fewer test files than at Step 17: the old `ActivityView`, `DayGroup` and `WebAnalyticsView`. A `Cannot find module './ActivityView'` or `'./DayGroup'` from `typecheck` means something outside the deleted set still imported an old component. Point it at R1-9's `activity/` modules.

- [ ] **Step 22: Commit**

Run with the Bash tool, only after the owner approves:
```bash
git add src/shell/AdminShell.tsx
USER_APPROVED=1 git commit -m "refactor(analytics): delete the old analytics page and its tab views (#24)"
```

Step 20's `git rm` already staged the 12 deletions. This commit carries them, together with the shell comment if Step 20 changed it.

<!-- Review notes applied, some adjusted:
2: the find-and-update grep moved to Step 13, so the tests change before the implementation. Its pattern is tighter: `/analytics\b` also matches every `tools/analytics/…` import. Step 17 runs `pnpm test:run` plus a confirming grep.
3: the NAV_ITEMS assertions moved to R1-6's src/shell/nav.test.ts.
4: the quoted line is R1-6's exact entry.
5: the combined grep became scoped greps (src/ui, analytics/web, imports only), so R1-8's overview lines and R1-9's own ActivityView can't break the expected output.
6: VerdictHero's accuracy value and WeeklyActivityChart's tooltip use fmtGap too.
8: R1-12 already owns D10 (its Step 8) and CLAUDE.md (its Step 4), so this task's CLAUDE.md step is gone. TabList goes to R1-12 (see Contract additions). -->
