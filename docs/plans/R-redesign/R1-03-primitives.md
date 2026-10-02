> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

**Contract additions (R1-3):** no names or types change. This task depends on a few things the contract doesn't fix. Whoever writes R1-2 should keep them true or flag the conflict:
- **`ADMIN_TYPE` slots.** They follow the R-5 table row by row: `micro` 10 (`FONT_SIZES.xs`), `label` 11 (`sm`), `small` 12 (`md`), `body` 13 (`base`), `kpi` = `FONT_SIZES.displaySm`. The KPI label uses `small` and the KPI hint uses `label`. RawTag uses `micro`. Panel titles and notice text use `body`.
- **`ADMIN_COLORS.over` / `.under`** are the app's hex tokens (`COLORS.error` / `COLORS.success`, R-1), because ScorePill tints them with `hexRgba`.
- **Panel fill.** Panel and KpiCard fill with `ADMIN_COLORS.card`, the handoff's `#12121b` cards. The info Notice fills with `ADMIN_COLORS.panel` (`#101018`).
- **Selected segment.** AdminStyles draws `.adm-seg-btn[aria-pressed="true"]` with a cue of at least 3:1 (review `custom-pickers-no-state`). SegmentedControl only sets the attribute.
- **Behaviour later tasks may rely on:**
  - SegmentedControl never calls `onChange` for the option that is already selected.
  - KpiCard is `role="group"` named by its label.
  - A titled Panel is a `region` named by its `h2`.
  - `Notice tone="error"` is `role="alert"`.
  - MeterBar with a `label` is `role="meter"`.
  - ScorePill picks the band from the value it shows. An average that rounds to "7.0" reads high, and one that rounds to "4.0" reads low.

### Task R1-3: Formatting helpers and UI primitives

This task adds three things:
- `src/ui/format.ts`, the shared number and date text.
- The nine primitives every R1 page is built from, each with a test.
- One stories file.

It also moves `Sparkline` out of `WebAnalyticsView` into `src/ui/`. It depends on R1-2: `src/theme/adminTheme.ts` and `src/theme/AdminStyles.tsx` must exist.

Review findings this task applies:
- **`null-score-votes`:** a vote with no score shows `—` in its ScorePill, named "No score", and never gets a band colour. `fmtScore(null)` returns `—`.
- **`dim-text-contrast` / R-6:** hints and the raw tag use `muted`. This changes colour only: the tag stays 10px per R-5. `dim` is used only for the centre tick, which is decoration.
- **Red pill contrast:** the band tint is `.08`, not `.12`.
- **`custom-pickers-no-state`:** segmented options use `aria-pressed` inside a named group.
- **`mode-tab-wipes-draft`:** pressing the selected option again does nothing.
- **`small-targets-headings`:** panel titles are `h2` under the page's `h1`.
- **`lint-scales` / `type-radius-off-scale`:** every size and radius comes from a token.

**Files:**
- Create: `src/ui/format.ts`, `src/ui/Panel.tsx`, `src/ui/KpiCard.tsx`, `src/ui/SegmentedControl.tsx`, `src/ui/MeterBar.tsx`, `src/ui/BiasBar.tsx`, `src/ui/ScorePill.tsx`, `src/ui/RawTag.tsx`, `src/ui/Notice.tsx`, `src/ui/Sparkline.tsx`, `src/ui/Primitives.stories.tsx`
- Modify: `src/tools/analytics/WebAnalyticsView.tsx`:
  - the imports at lines 1–3;
  - delete the local `Sparkline` at lines 58–89;
  - the call site at line 128.
- Test: `src/ui/__tests__/format.test.ts`, `src/ui/__tests__/Panel.test.tsx`, `src/ui/__tests__/KpiCard.test.tsx`, `src/ui/__tests__/RawTag.test.tsx`, `src/ui/__tests__/SegmentedControl.test.tsx`, `src/ui/__tests__/MeterBar.test.tsx`, `src/ui/__tests__/BiasBar.test.tsx`, `src/ui/__tests__/ScorePill.test.tsx`, `src/ui/__tests__/Notice.test.tsx`, `src/ui/__tests__/Sparkline.test.tsx`

**Interfaces:**
- **Consumes:**
  - From R1-2's `src/theme/adminTheme.ts`:
    - `ADMIN_COLORS`: `page`, `panel`, `card`, `border`, `strongBorder`, `divider`, `barTrack`, `barNeutral`, `text`, `muted`, `dim`, `accent`, `over`, `under`, `errorBg`, `errorBorder`
    - `ADMIN_TYPE`: `micro`, `label`, `small`, `body`, `kpi`
    - `ADMIN_RADIUS`: `tag`, `control`, `panel`
  - From R1-2's `src/theme/AdminStyles.tsx`: its `adm-seg` and `adm-seg-btn` classes. This task never mounts `AdminStyles`: `AdminShell` does on the site, and `.storybook/preview.tsx` (R1-2 Step 9) does for every story.
  - From `src/app-bridge.ts` (already exported): `FONTS`, `RADIUS`, `SPACING`, `hexRgba`, and `LinkButton` (stories only).
- **Produces** (exactly as in the Shared interfaces):
  - Formatting: `fmtInt`, `fmtGap`, `fmtScore`, `fmtDay`, `fmtWeekday`.
  - Primitives: `Panel`, `KpiCard`, `SegmentedControl`, `MeterBar`, `BiasBar`, `ScorePill`, `RawTag`, `Notice`, `Sparkline`.
  - Each lives in its own module (`src/ui/format.ts`, `src/ui/Panel.tsx` and so on), and there is no barrel. Pages import per file, for example `import {Panel} from '../../../ui/Panel';`.

If the engine hasn't been built in this checkout yet, run `pnpm build:engine` once first. The tests load `src/app-bridge.ts`, which imports app modules that need the built engine.

- [ ] **Step 1: Write the failing formatting tests**

Create `src/ui/__tests__/format.test.ts`:

```ts
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fmtDay, fmtGap, fmtInt, fmtScore, fmtWeekday} from '../format';

const MINUS = '\u2212';

// The zone this run started in. Deleting TZ doesn't reset Node's zone cache, so
// the time-zone cleanup names this zone again before Vitest drops the stub.
const HOST_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

describe('fmtInt', () => {
  it('groups thousands', () => {
    expect(fmtInt(0)).toBe('0');
    expect(fmtInt(7)).toBe('7');
    expect(fmtInt(2054)).toBe('2,054');
    expect(fmtInt(1234567)).toBe('1,234,567');
  });

  it('rounds to a whole number', () => {
    expect(fmtInt(2.6)).toBe('3');
    expect(fmtInt(2.4)).toBe('2');
  });

  it('writes a negative with the true minus sign, and never a negative zero', () => {
    expect(fmtInt(-1200)).toBe(`${MINUS}1,200`);
    expect(fmtInt(-0.4)).toBe('0');
    expect(fmtInt(-0)).toBe('0');
  });

  it('shows a dash for a value that is not a number', () => {
    expect(fmtInt(NaN)).toBe('—');
    expect(fmtInt(Infinity)).toBe('—');
  });
});

describe('fmtGap', () => {
  it('signs a gap both ways, to two places', () => {
    expect(fmtGap(-0.3)).toBe(`${MINUS}0.30`);
    expect(fmtGap(0.83)).toBe('+0.83');
    expect(fmtGap(1.234)).toBe('+1.23');
    expect(fmtGap(-2.5)).toBe(`${MINUS}2.50`);
  });

  it('uses U+2212, never a hyphen', () => {
    expect(fmtGap(-0.3).codePointAt(0)).toBe(0x2212);
    expect(fmtGap(-0.3)).not.toContain('-');
  });

  it('leaves zero, and anything that rounds to it, unsigned', () => {
    expect(fmtGap(0)).toBe('0.00');
    expect(fmtGap(-0)).toBe('0.00');
    expect(fmtGap(-0.004)).toBe('0.00');
    expect(fmtGap(0.004)).toBe('0.00');
  });

  it('shows a dash when there is no gap', () => {
    expect(fmtGap(null)).toBe('—');
    expect(fmtGap(NaN)).toBe('—');
  });
});

describe('fmtScore', () => {
  it('defaults to one decimal place', () => {
    expect(fmtScore(6.44)).toBe('6.4');
    expect(fmtScore(6.46)).toBe('6.5');
    expect(fmtScore(7)).toBe('7.0');
  });

  it('takes the number of places', () => {
    expect(fmtScore(7, 0)).toBe('7');
    expect(fmtScore(6.456, 2)).toBe('6.46');
  });

  it('writes a negative with the true minus sign, and never a negative zero', () => {
    expect(fmtScore(-1.24)).toBe(`${MINUS}1.2`);
    expect(fmtScore(-0.04)).toBe('0.0');
  });

  it('shows a dash for an unscored value', () => {
    expect(fmtScore(null)).toBe('—');
    expect(fmtScore(NaN)).toBe('—');
  });
});

describe('fmtDay and fmtWeekday', () => {
  it('label a day by month and date, with no leading zero', () => {
    expect(fmtDay('2026-09-30')).toBe('Sep 30');
    expect(fmtDay('2026-01-01')).toBe('Jan 1');
    expect(fmtDay('2026-12-31')).toBe('Dec 31');
    expect(fmtDay('2024-02-29')).toBe('Feb 29');
  });

  it('put the weekday first', () => {
    expect(fmtWeekday('2026-09-30')).toBe('Wed Sep 30');
    expect(fmtWeekday('2026-01-01')).toBe('Thu Jan 1');
    expect(fmtWeekday('2026-10-03')).toBe('Sat Oct 3');
    expect(fmtWeekday('2026-10-04')).toBe('Sun Oct 4');
  });

  it.each(['2026-02-29', '2026-13-01', '2026-00-10', '2026-9-30', '2026-09-30T12:00:00Z', 'not a day', ''])(
    'return %j unchanged, as it is not a YYYY-MM-DD day',
    (input) => {
      expect(fmtDay(input)).toBe(input);
      expect(fmtWeekday(input)).toBe(input);
    },
  );

  describe('in any time zone', () => {
    afterEach(() => {
      vi.stubEnv('TZ', HOST_ZONE);
      vi.unstubAllEnvs();
    });

    // UTC+14 and UTC−11, neither with daylight time: mixing local and UTC date
    // getters moves the day by one in one of them. Vitest's default forks pool
    // runs each file in a process where a TZ change takes effect.
    it.each(['Pacific/Kiritimati', 'Pacific/Pago_Pago'])('label the same day in %s', (zone) => {
      vi.stubEnv('TZ', zone);
      expect(fmtDay('2026-09-30')).toBe('Sep 30');
      expect(fmtWeekday('2026-09-30')).toBe('Wed Sep 30');
      expect(fmtWeekday('2026-01-01')).toBe('Thu Jan 1');
    });
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm vitest run src/ui/__tests__/format.test.ts`
Expected: FAIL. The suite doesn't load, because Vite can't resolve `../format` from `src/ui/__tests__/format.test.ts` ("Does the file exist?").

- [ ] **Step 3: Implement `src/ui/format.ts`**

```ts
/**
 * Number and date text shared by every admin page. Negative numbers carry the
 * true minus sign (U+2212) and a missing value reads as an em dash. Days are
 * 'YYYY-MM-DD' strings read as UTC calendar days, so a label never shifts with
 * the viewer's time zone.
 */

const MINUS = '\u2212';
const NO_VALUE = '—';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** |n| to `digits` places, plus the sign it shows: a value that rounds to zero shows none. */
function fixed(n: number, digits: number): {text: string; sign: number} {
  const text = Math.abs(n).toFixed(digits);
  return {text, sign: Number(text) === 0 ? 0 : Math.sign(n)};
}

/** 2054 -> "2,054", rounded to a whole number; -1200 -> "−1,200". */
export function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return NO_VALUE;
  const {text, sign} = fixed(n, 0);
  const grouped = Number(text).toLocaleString('en-US');
  return sign < 0 ? MINUS + grouped : grouped;
}

/** A calibration gap, signed both ways: -0.3 -> "−0.30", 0.83 -> "+0.83", 0 -> "0.00", null -> "—". */
export function fmtGap(gap: number | null): string {
  if (gap == null || !Number.isFinite(gap)) return NO_VALUE;
  const {text, sign} = fixed(gap, 2);
  if (sign === 0) return text;
  return (sign < 0 ? MINUS : '+') + text;
}

/** A score or an average of scores: 6.46 -> "6.5", (7, 0) -> "7", null -> "—". */
export function fmtScore(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return NO_VALUE;
  const {text, sign} = fixed(n, digits);
  return sign < 0 ? MINUS + text : text;
}

/** A 'YYYY-MM-DD' string as a UTC midnight, or null when it is not a real calendar day. */
function parseDay(day: string): Date | null {
  const match = DAY_RE.exec(day);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  // Date.UTC rolls "2026-02-30" over into March (and maps years below 100 to 19xx); the round trip rejects both.
  return date.toISOString().slice(0, 10) === day ? date : null;
}

/** "2026-09-30" -> "Sep 30". Anything that isn't a 'YYYY-MM-DD' day comes back unchanged. */
export function fmtDay(day: string): string {
  const date = parseDay(day);
  return date ? `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}` : day;
}

/** "2026-09-30" -> "Wed Sep 30". Anything that isn't a 'YYYY-MM-DD' day comes back unchanged. */
export function fmtWeekday(day: string): string {
  const date = parseDay(day);
  return date ? `${WEEKDAYS[date.getUTCDay()]} ${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}` : day;
}
```

- [ ] **Step 4: Run the tests again**

Run: `pnpm vitest run src/ui/__tests__/format.test.ts`
Expected: PASS, 23 tests.

- [ ] **Step 5: Lint, then commit the formatting helpers**

Run: `pnpm lint`
Expected: no errors.

Run with the Bash tool, only after the owner approves:
```bash
git add src/ui/format.ts src/ui/__tests__/format.test.ts
USER_APPROVED=1 git commit -m "feat(ui): add shared number and date formatting (#24)"
```

- [ ] **Step 6: Write the failing Panel test**

Create `src/ui/__tests__/Panel.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {SPACING} from '../../app-bridge';
import {Panel} from '../Panel';

describe('Panel', () => {
  it('is a region named by its h2 title, with the action in its header', () => {
    render(
      <Panel title="Rules to review" action={<a href="/calibration">Open calibration →</a>}>
        <p>Ramp</p>
      </Panel>,
    );
    const panel = screen.getByRole('region', {name: 'Rules to review'});
    expect(within(panel).getByRole('heading', {level: 2, name: 'Rules to review'})).toBeInTheDocument();
    expect(within(panel).getByRole('link', {name: 'Open calibration →'})).toHaveAttribute('href', '/calibration');
    expect(within(panel).getByText('Ramp')).toBeInTheDocument();
  });

  it('has no heading and is no landmark without a title', () => {
    render(
      <Panel>
        <p>Body only</p>
      </Panel>,
    );
    expect(screen.getByText('Body only')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('pads its body unless told not to, for flush tables', () => {
    const {rerender} = render(
      <Panel title="Vote log">
        <table />
      </Panel>,
    );
    expect(screen.getByRole('region', {name: 'Vote log'})).toHaveStyle({padding: `${SPACING.xl}px`});
    expect(screen.getByRole('region', {name: 'Vote log'})).toHaveStyle({backgroundClip: 'padding-box'});

    rerender(
      <Panel title="Vote log" padded={false}>
        <table />
      </Panel>,
    );
    expect(screen.getByRole('region', {name: 'Vote log'})).toHaveStyle({padding: '0px'});
  });
});
```

- [ ] **Step 7: Run it to see it fail**

Run: `pnpm vitest run src/ui/__tests__/Panel.test.tsx`
Expected: FAIL. Vite can't resolve `../Panel` from `src/ui/__tests__/Panel.test.tsx`.

- [ ] **Step 8: Implement `src/ui/Panel.tsx`**

```tsx
import {useId} from 'react';
import {SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

interface PanelProps {
  /** The panel's h2, which also names it as a region. */
  title?: string;
  /** The right end of the header row: a link, a control or a caption. */
  action?: React.ReactNode;
  children: React.ReactNode;
  /**
   * Default true. False drops the body padding so a table or list runs edge to
   * edge; the header then keeps its own padding and a divider underneath.
   */
  padded?: boolean;
}

/**
 * The surface the insights pages are built from: a bordered panel with an
 * optional header row (the h2 title on the left, an action on the right). A
 * titled panel is a named region, so screen-reader users can move between
 * panels the way they move between headings.
 */
export function Panel({title, action, children, padded = true}: PanelProps) {
  const titleId = useId();
  const hasHeader = Boolean(title) || action != null;
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: padded ? SPACING.md : 0,
        minWidth: 0,
        // The translucent fill stops at the border, so the edge stays on the
        // ladder (R1-2). Not the `background` shorthand: it would reset the clip.
        backgroundColor: ADMIN_COLORS.card,
        backgroundClip: 'padding-box',
        border: `1px solid ${ADMIN_COLORS.border}`,
        borderRadius: ADMIN_RADIUS.panel,
        padding: padded ? SPACING.xl : 0,
        // A flush table's corners would poke past the radius.
        overflow: padded ? undefined : 'hidden',
      }}>
      {hasHeader && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: SPACING.md,
            ...(padded
              ? {}
              : {padding: `${SPACING.section}px ${SPACING.lg}px`, borderBottom: `1px solid ${ADMIN_COLORS.border}`}),
          }}>
          {title && (
            <h2 id={titleId} style={{margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 700, color: ADMIN_COLORS.text}}>
              {title}
            </h2>
          )}
          {action != null && (
            <div style={{marginLeft: 'auto', fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>{action}</div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
```

- [ ] **Step 9: Run the test again**

Run: `pnpm vitest run src/ui/__tests__/Panel.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 10: Write the failing RawTag and KpiCard tests**

Create `src/ui/__tests__/RawTag.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {RawTag} from '../RawTag';

describe('RawTag', () => {
  it('reads "raw" and says where the number comes from on hover', () => {
    render(<RawTag />);
    expect(screen.getByText('raw')).toHaveAttribute('title', 'From the raw vote log');
  });
});
```

Create `src/ui/__tests__/KpiCard.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {KpiCard} from '../KpiCard';
import {RawTag} from '../RawTag';

describe('KpiCard', () => {
  it('groups the value and hint under the label, leaving the tag out of the name', () => {
    render(<KpiCard label="Distinct voters" value="114" hint="from raw vote log" tag={<RawTag />} />);
    const card = screen.getByRole('group', {name: 'Distinct voters'});
    expect(within(card).getByText('114')).toBeInTheDocument();
    expect(within(card).getByText('from raw vote log')).toBeInTheDocument();
    expect(within(card).getByText('raw')).toBeInTheDocument();
  });

  it('draws the value in the text colour unless given one', () => {
    const {rerender} = render(<KpiCard label="Total votes" value="2,054" />);
    expect(screen.getByText('2,054')).toHaveStyle({color: ADMIN_COLORS.text});

    rerender(<KpiCard label="Engine-silent pairs" value="196" valueColor={ADMIN_COLORS.accent} />);
    expect(screen.getByText('196')).toHaveStyle({color: ADMIN_COLORS.accent});
  });

  it('leaves the hint out when there is none', () => {
    render(<KpiCard label="Pairs covered" value="1,928" />);
    expect(screen.getByRole('group', {name: 'Pairs covered'})).toHaveTextContent(/^Pairs covered1,928$/);
  });
});
```

- [ ] **Step 11: Run them to see them fail**

Run: `pnpm vitest run src/ui/__tests__/RawTag.test.tsx src/ui/__tests__/KpiCard.test.tsx`
Expected: FAIL. Both suites fail to load, because `../RawTag` and `../KpiCard` don't resolve.

- [ ] **Step 12: Implement `src/ui/RawTag.tsx` and `src/ui/KpiCard.tsx`**

`src/ui/RawTag.tsx`:

```tsx
import {SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

/**
 * Marks a number computed from the raw vote log (vote-log.json) rather than
 * the aggregates, as KpiCard's `tag`. Pages hide those numbers when the
 * artifact has no raw votes. The tag is informative, so it takes the muted
 * colour (R-6).
 */
export function RawTag() {
  return (
    <span
      title="From the raw vote log"
      style={{
        fontSize: ADMIN_TYPE.micro,
        fontWeight: 500,
        lineHeight: 1.4,
        color: ADMIN_COLORS.muted,
        border: `1px solid ${ADMIN_COLORS.strongBorder}`,
        borderRadius: ADMIN_RADIUS.tag,
        padding: `0 ${SPACING.xs}px`,
      }}>
      raw
    </span>
  );
}
```

`src/ui/KpiCard.tsx`:

```tsx
import {useId} from 'react';
import {FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  /** Sits after the label, outside the card's name: <RawTag /> on raw-vote stats. */
  tag?: React.ReactNode;
  /** The value's colour; defaults to the text colour (the Overview golds "Engine-silent pairs"). */
  valueColor?: string;
}

/**
 * One headline number: the label, the value in Tinos at the KPI size, and a
 * hint. The card is a group named by its label, so a screen reader reads the
 * label with the value. Hints carry data, so they take the muted colour, never
 * dim (R-6).
 */
export function KpiCard({label, value, hint, tag, valueColor = ADMIN_COLORS.text}: KpiCardProps) {
  const labelId = useId();
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.sm,
        minWidth: 0,
        // Clipped to the padding box, as Panel's fill is (R1-2).
        backgroundColor: ADMIN_COLORS.card,
        backgroundClip: 'padding-box',
        border: `1px solid ${ADMIN_COLORS.border}`,
        borderRadius: ADMIN_RADIUS.panel,
        padding: `${SPACING.lg}px ${SPACING.xl}px`,
      }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.sm,
          fontSize: ADMIN_TYPE.small,
          fontWeight: 500,
          color: ADMIN_COLORS.muted,
        }}>
        <span id={labelId}>{label}</span>
        {tag}
      </div>
      <div style={{fontFamily: FONTS.hero, fontSize: ADMIN_TYPE.kpi, fontWeight: 400, lineHeight: 1, color: valueColor}}>
        {value}
      </div>
      {hint != null && <div style={{fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{hint}</div>}
    </div>
  );
}
```

- [ ] **Step 13: Run the tests again**

Run: `pnpm vitest run src/ui/__tests__/RawTag.test.tsx src/ui/__tests__/KpiCard.test.tsx`
Expected: PASS, 4 tests (1 + 3).

- [ ] **Step 14: Write the failing SegmentedControl test**

Create `src/ui/__tests__/SegmentedControl.test.tsx`:

```tsx
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {SegmentedControl} from '../SegmentedControl';

type SortKey = 'gap' | 'votes';
const OPTIONS: ReadonlyArray<{value: SortKey; label: string}> = [
  {value: 'gap', label: '|Gap|'},
  {value: 'votes', label: 'Votes'},
];

/** Holds the value the way a page does, so aria-pressed follows each change. */
function Harness({onChange}: {onChange: (v: SortKey) => void}) {
  const [value, setValue] = useState<SortKey>('gap');
  return (
    <SegmentedControl
      ariaLabel="Sort rules"
      options={OPTIONS}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe('SegmentedControl', () => {
  it('is a named group of toggle buttons with the selected one pressed', () => {
    render(<Harness onChange={() => {}} />);
    expect(screen.getByRole('group', {name: 'Sort rules'})).toBeInTheDocument();
    const gap = screen.getByRole('button', {name: '|Gap|'});
    expect(gap).toHaveAttribute('aria-pressed', 'true');
    expect(gap).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', {name: 'Votes'})).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports a click on another option', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', {name: 'Votes'}));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('votes');
    expect(screen.getByRole('button', {name: 'Votes'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: '|Gap|'})).toHaveAttribute('aria-pressed', 'false');
  });

  it('works from the keyboard: Tab between options, Enter or Space to pick', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', {name: 'Votes'})).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('votes');

    await userEvent.tab({shift: true});
    expect(screen.getByRole('button', {name: '|Gap|'})).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith('gap');
    expect(screen.getByRole('button', {name: '|Gap|'})).toHaveAttribute('aria-pressed', 'true');
  });

  it('ignores a press on the option that is already selected', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', {name: '|Gap|'}));
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 15: Run it to see it fail**

Run: `pnpm vitest run src/ui/__tests__/SegmentedControl.test.tsx`
Expected: FAIL. Vite can't resolve `../SegmentedControl`.

- [ ] **Step 16: Implement `src/ui/SegmentedControl.tsx`**

The component uses native buttons with class names only, because a `style` prop on `<button>` would trip `inkweave/no-adhoc-buttons`. `AdminStyles` (R1-2) styles `.adm-seg` and `.adm-seg-btn`.

```tsx
interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<{value: T; label: string}>;
  value: T;
  onChange: (v: T) => void;
  /** Names the group for assistive tech: "Sort rules", "Score band". */
  ariaLabel: string;
}

/**
 * A row of mutually exclusive options: sort keys, score bands, the studio
 * mode. Native buttons in a named group, so each is a Tab stop that fires on
 * Enter or Space; aria-pressed carries the selection, and AdminStyles draws it
 * (`.adm-seg-btn[aria-pressed="true"]`). Pressing the selected option again
 * does nothing, so a parent that resets state on change (Card studio's mode)
 * can't lose work to a stray click.
 */
export function SegmentedControl<T extends string>({options, value, onChange, ariaLabel}: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className="adm-seg">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="adm-seg-btn"
          aria-pressed={option.value === value}
          onClick={() => {
            if (option.value !== value) onChange(option.value);
          }}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 17: Run the test again**

Run: `pnpm vitest run src/ui/__tests__/SegmentedControl.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 18: Write the failing MeterBar and BiasBar tests**

Create `src/ui/__tests__/MeterBar.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {MeterBar} from '../MeterBar';

describe('MeterBar', () => {
  it('is a named meter when labelled, filled to its share', () => {
    render(<MeterBar fraction={0.4} color={ADMIN_COLORS.accent} label="Voter 41: 40% of votes" />);
    const meter = screen.getByRole('meter', {name: 'Voter 41: 40% of votes'});
    expect(meter).toHaveAttribute('aria-valuenow', '40');
    expect(meter.firstElementChild).toHaveStyle({width: '40%'});
  });

  it.each([
    [1.7, '100%', '100'],
    [-0.2, '0%', '0'],
    [NaN, '0%', '0'],
  ])('clamps a fraction of %s to %s', (fraction, width, now) => {
    render(<MeterBar fraction={fraction} color={ADMIN_COLORS.accent} label="Share" />);
    const meter = screen.getByRole('meter', {name: 'Share'});
    expect(meter).toHaveAttribute('aria-valuenow', now);
    expect(meter.firstElementChild).toHaveStyle({width});
  });

  it('is hidden from assistive tech without a label', () => {
    const {container} = render(<MeterBar fraction={0.5} color={ADMIN_COLORS.accent} />);
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
```

Create `src/ui/__tests__/BiasBar.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {BiasBar} from '../BiasBar';

/** The fill is the one element that says which way it leans. */
function fillOf(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-direction]');
}

describe('BiasBar', () => {
  it('leans left in the over-rates colour for a negative gap', () => {
    const {container} = render(<BiasBar gap={-1} />);
    const fill = fillOf(container);
    expect(fill).toHaveAttribute('data-direction', 'over');
    // 1 / 2.5 of a half-track = 20% of the whole track.
    expect(fill).toHaveStyle({right: '50%', width: '20%', background: ADMIN_COLORS.over});
  });

  it('leans right in the under-rates colour for a positive gap', () => {
    const {container} = render(<BiasBar gap={0.5} />);
    const fill = fillOf(container);
    expect(fill).toHaveAttribute('data-direction', 'under');
    expect(fill).toHaveStyle({left: '50%', width: '10%', background: ADMIN_COLORS.under});
  });

  it.each([4, -10])('clamps a gap of %s to the end of its half', (gap) => {
    const {container} = render(<BiasBar gap={gap} />);
    expect(fillOf(container)).toHaveStyle({width: '50%'});
  });

  it('takes its full scale from the scale prop', () => {
    const {container} = render(<BiasBar gap={1} scale={1} />);
    expect(fillOf(container)).toHaveStyle({width: '50%'});
  });

  it.each([null, 0])('draws only the track and tick for a gap of %s', (gap) => {
    const {container} = render(<BiasBar gap={gap} />);
    expect(fillOf(container)).toBeNull();
  });

  it('is hidden from assistive tech, since the gap is printed beside it', () => {
    const {container} = render(<BiasBar gap={-1} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
```

- [ ] **Step 19: Run them to see them fail**

Run: `pnpm vitest run src/ui/__tests__/MeterBar.test.tsx src/ui/__tests__/BiasBar.test.tsx`
Expected: FAIL. `../MeterBar` and `../BiasBar` don't resolve.

- [ ] **Step 20: Implement `src/ui/MeterBar.tsx` and `src/ui/BiasBar.tsx`**

`src/ui/MeterBar.tsx`:

```tsx
import {RADIUS} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';

interface MeterBarProps {
  /** The filled share, 0 to 1; anything outside is clamped. */
  fraction: number;
  color: string;
  /** Track height in px (default 6). */
  height?: number;
  /**
   * Names the bar as a meter for assistive tech. Leave it out when the number
   * the bar shows is printed beside it: the bar is then decoration.
   */
  label?: string;
}

/** A horizontal share bar on the neutral track: voter activity, event share, dimension participation. */
export function MeterBar({fraction, color, height = 6, label}: MeterBarProps) {
  const percent = Number.isFinite(fraction) ? Math.min(Math.max(fraction, 0), 1) * 100 : 0;
  const track: React.CSSProperties = {height, background: ADMIN_COLORS.barTrack, borderRadius: RADIUS.xs, overflow: 'hidden'};
  const fill = <div style={{width: `${percent}%`, height: '100%', background: color, borderRadius: RADIUS.xs}} />;
  if (label == null) {
    return (
      <div aria-hidden="true" style={track}>
        {fill}
      </div>
    );
  }
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      style={track}>
      {fill}
    </div>
  );
}
```

`src/ui/BiasBar.tsx` replaces `RuleCalibrationTable`'s private `GapBar`, which is removed in R2. The tick uses `dim` rather than the handoff's `#4a4a60`. It is decoration: the bar is aria-hidden, and every use prints the gap beside it.

```tsx
import {RADIUS} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';

/** A |gap| this large fills a whole half-track, as the rules table has drawn it since the port. */
const DEFAULT_SCALE = 2.5;
const TRACK = 6;
const TICK = 12;

interface BiasBarProps {
  /** Community minus engine: negative = the engine over-rates. Null = no scored votes. */
  gap: number | null;
  /** The |gap| that fills a half-track (default 2.5 points). */
  scale?: number;
}

/** Which way the fill leans and how far (percent of the whole track), or null when there is nothing to draw. */
function fillFor(gap: number | null, scale: number): {direction: 'over' | 'under'; width: number} | null {
  if (gap == null || !Number.isFinite(gap) || gap === 0) return null;
  return {direction: gap < 0 ? 'over' : 'under', width: Math.min(Math.abs(gap) / scale, 1) * 50};
}

/**
 * The diverging gap bar: from a centre tick, the fill runs left in the
 * over-rates colour for a negative gap and right in the under-rates colour for
 * a positive one, |gap| / scale of a half-track wide and clamped at the end.
 * Decoration (aria-hidden): every use prints the gap beside it with fmtGap.
 */
export function BiasBar({gap, scale = DEFAULT_SCALE}: BiasBarProps) {
  const fill = fillFor(gap, scale);
  return (
    <div
      aria-hidden="true"
      style={{position: 'relative', height: TRACK, minWidth: 64, background: ADMIN_COLORS.barTrack, borderRadius: RADIUS.xs}}>
      {fill && (
        <div
          data-direction={fill.direction}
          style={{
            position: 'absolute',
            top: 0,
            height: TRACK,
            width: `${fill.width}%`,
            borderRadius: RADIUS.xs,
            background: fill.direction === 'over' ? ADMIN_COLORS.over : ADMIN_COLORS.under,
            ...(fill.direction === 'over' ? {right: '50%'} : {left: '50%'}),
          }}
        />
      )}
      {/* The tick goes last so it stays visible over the fill's inner end. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: (TRACK - TICK) / 2,
          width: 1,
          height: TICK,
          background: ADMIN_COLORS.dim,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 21: Run the tests again**

Run: `pnpm vitest run src/ui/__tests__/MeterBar.test.tsx src/ui/__tests__/BiasBar.test.tsx`
Expected: PASS, 13 tests (5 + 8).

- [ ] **Step 22: Write the failing ScorePill test**

Create `src/ui/__tests__/ScorePill.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {ScorePill} from '../ScorePill';

describe('ScorePill', () => {
  it.each([7, 10])('colours a high score (%s) in the under-rates colour', (score) => {
    render(<ScorePill score={score} />);
    expect(screen.getByText(String(score))).toHaveStyle({color: ADMIN_COLORS.under});
  });

  it.each([1, 4])('colours a low score (%s) in the over-rates colour', (score) => {
    render(<ScorePill score={score} />);
    expect(screen.getByText(String(score))).toHaveStyle({color: ADMIN_COLORS.over});
  });

  it.each([5, 6])('leaves a middling score (%s) neutral', (score) => {
    render(<ScorePill score={score} />);
    expect(screen.getByText(String(score))).toHaveStyle({color: ADMIN_COLORS.text});
  });

  it('shows an average to one place, in its band', () => {
    render(<ScorePill score={6.5} />);
    expect(screen.getByText('6.5')).toHaveStyle({color: ADMIN_COLORS.text});
  });

  it('bands an average by the value it shows', () => {
    render(<ScorePill score={6.96} />);
    expect(screen.getByText('7.0')).toHaveStyle({color: ADMIN_COLORS.under});
    render(<ScorePill score={4.04} />);
    expect(screen.getByText('4.0')).toHaveStyle({color: ADMIN_COLORS.over});
  });

  it('shows a named dash for a vote with no score, in no band', () => {
    render(<ScorePill score={null} />);
    const pill = screen.getByRole('img', {name: 'No score'});
    expect(pill).toHaveTextContent('—');
    expect(pill).toHaveStyle({color: ADMIN_COLORS.muted});
  });
});
```

- [ ] **Step 23: Run it to see it fail**

Run: `pnpm vitest run src/ui/__tests__/ScorePill.test.tsx`
Expected: FAIL. `../ScorePill` doesn't resolve.

- [ ] **Step 24: Implement `src/ui/ScorePill.tsx`**

```tsx
import {SPACING, hexRgba} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';
import {fmtScore} from './format';

/**
 * The band tint. The 2026-10-01 review measured the over-rates red at 4.4:1 on
 * the handoff's .12 tint and 4.6:1 at .08; 12px bold text needs 4.5:1.
 */
const TINT = 0.08;

const PILL: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  minWidth: 28,
  height: 24,
  padding: `0 ${SPACING.sm}px`,
  borderRadius: ADMIN_RADIUS.control,
  fontSize: ADMIN_TYPE.small,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
};

/** 7 and up reads high (the under-rates colour), 4 and below low (over-rates), 5 and 6 neutral. */
function bandColors(score: number): React.CSSProperties {
  if (score >= 7) return {color: ADMIN_COLORS.under, background: hexRgba(ADMIN_COLORS.under, TINT)};
  if (score <= 4) return {color: ADMIN_COLORS.over, background: hexRgba(ADMIN_COLORS.over, TINT)};
  return {color: ADMIN_COLORS.text, background: ADMIN_COLORS.barTrack};
}

/**
 * A community score (1 to 10) as a coloured pill; an average shows one
 * decimal. A quick vote has no score (null): its pill is a neutral dash,
 * named "No score" for screen readers, and never takes a band colour.
 */
export function ScorePill({score}: {score: number | null}) {
  if (score == null) {
    return (
      <span role="img" aria-label="No score" style={{...PILL, color: ADMIN_COLORS.muted, background: ADMIN_COLORS.barTrack}}>
        {fmtScore(null)}
      </span>
    );
  }
  // Band the value the pill shows, so an average that rounds to "7.0" reads high and one that rounds to "4.0" low.
  const digits = Number.isInteger(score) ? 0 : 1;
  const shown = Number(score.toFixed(digits));
  return <span style={{...PILL, ...bandColors(shown)}}>{fmtScore(shown, digits)}</span>;
}
```

- [ ] **Step 25: Run the test again**

Run: `pnpm vitest run src/ui/__tests__/ScorePill.test.tsx`
Expected: PASS, 9 tests.

- [ ] **Step 26: Write the failing Notice test**

Create `src/ui/__tests__/Notice.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {Notice} from '../Notice';

describe('Notice', () => {
  it('shows an info message without interrupting a screen reader', () => {
    render(<Notice>No events tracked yet.</Notice>);
    expect(screen.getByText('No events tracked yet.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces an error as an alert', () => {
    render(<Notice tone="error">Could not load Web Analytics (vercel-analytics.json: 404).</Notice>);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load Web Analytics (vercel-analytics.json: 404).');
  });
});
```

- [ ] **Step 27: Run it to see it fail**

Run: `pnpm vitest run src/ui/__tests__/Notice.test.tsx`
Expected: FAIL. `../Notice` doesn't resolve.

- [ ] **Step 28: Implement `src/ui/Notice.tsx`**

```tsx
import {SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

// Fills go in as backgroundColor: a `background` shorthand would reset the clip.
// Only the info fill is translucent, so only it is clipped to the padding box
// (R1-2); errorBg is opaque.
const TONES = {
  info: {
    backgroundColor: ADMIN_COLORS.panel,
    backgroundClip: 'padding-box',
    border: `1px dashed ${ADMIN_COLORS.strongBorder}`,
    color: ADMIN_COLORS.muted,
  },
  error: {backgroundColor: ADMIN_COLORS.errorBg, border: `1px solid ${ADMIN_COLORS.errorBorder}`, color: ADMIN_COLORS.text},
} as const;

interface NoticeProps {
  /** 'info' (default): loading, empty and setup states. 'error': a failed load, announced as an alert. */
  tone?: 'info' | 'error';
  children: React.ReactNode;
}

/**
 * A full-width message box: the dashed info box for "Loading analytics...",
 * "No events tracked yet." and the setup notices, or the red error box for a
 * failed load. Only the error tone is a live region (role="alert").
 */
export function Notice({tone = 'info', children}: NoticeProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      style={{
        ...TONES[tone],
        borderRadius: ADMIN_RADIUS.panel,
        padding: `${SPACING.section}px ${SPACING.lg}px`,
        fontSize: ADMIN_TYPE.body,
        lineHeight: 1.5,
      }}>
      {children}
    </div>
  );
}
```

- [ ] **Step 29: Run the test again**

Run: `pnpm vitest run src/ui/__tests__/Notice.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 30: Write the failing Sparkline test**

Create `src/ui/__tests__/Sparkline.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {Sparkline} from '../Sparkline';

describe('Sparkline', () => {
  it('renders nothing for fewer than two points: a line needs two', () => {
    for (const data of [[], [5]]) {
      const {container, unmount} = render(<Sparkline data={data} />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it('draws one vertex per point in the accent colour, hidden from assistive tech', () => {
    const {container} = render(<Sparkline data={[3, 9, 4, 12]} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('height', '56');
    const line = container.querySelector('polyline');
    expect(line?.getAttribute('points')?.split(' ')).toHaveLength(4);
    expect(line).toHaveAttribute('stroke', ADMIN_COLORS.accent);
  });

  it('takes a colour and a height', () => {
    const {container} = render(<Sparkline data={[1, 2]} color={ADMIN_COLORS.barNeutral} height={28} />);
    expect(container.querySelector('svg')).toHaveAttribute('height', '28');
    expect(container.querySelector('polyline')).toHaveAttribute('stroke', ADMIN_COLORS.barNeutral);
    expect(container.querySelector('polygon')).toHaveAttribute('fill', ADMIN_COLORS.barNeutral);
  });

  it('keeps an all-zero series on the floor instead of dividing by zero', () => {
    const {container} = render(<Sparkline data={[0, 0, 0]} height={28} />);
    // The floor is the height less the 4px pad.
    expect(container.querySelector('polyline')).toHaveAttribute('points', '0.00,24.00 50.00,24.00 100.00,24.00');
  });
});
```

- [ ] **Step 31: Run it to see it fail**

Run: `pnpm vitest run src/ui/__tests__/Sparkline.test.tsx`
Expected: FAIL. `../Sparkline` doesn't resolve.

- [ ] **Step 32: Implement `src/ui/Sparkline.tsx`**

This is the `WebAnalyticsView` sparkline with three changes:
- It takes `color` and `height`.
- The area fill uses `fillOpacity`, so any colour works, including the composed neutrals that `hexRgba` can't take.
- The line drops its 0.7 opacity, so a neutral line keeps its contrast.

The svg also loses its top margin; callers add the spacing.

```tsx
import {ADMIN_COLORS} from '../theme/adminTheme';

/** viewBox width; the svg stretches to its container (preserveAspectRatio none). */
const VIEW_WIDTH = 100;
/** Keeps the line's peaks and floor clear of the svg's edges. */
const PAD = 4;

interface SparklineProps {
  data: number[];
  /** The line and its faint area fill (default the accent gold). Any CSS colour. */
  color?: string;
  /** Height in px (default 56). */
  height?: number;
}

/**
 * A slim line sparkline with a faint area fill that stretches to its
 * container's width (moved from WebAnalyticsView). A line needs two points,
 * so it renders nothing for fewer. Decoration (aria-hidden): the totals it
 * illustrates are printed beside it.
 */
export function Sparkline({data, color = ADMIN_COLORS.accent, height = 56}: SparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data);
  const stepX = VIEW_WIDTH / (data.length - 1);
  const line = data
    .map((v, i) => `${(i * stepX).toFixed(2)},${(height - PAD - (v / max) * (height - 2 * PAD)).toFixed(2)}`)
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{display: 'block'}}>
      <polygon points={`0,${height} ${line} ${VIEW_WIDTH},${height}`} fill={color} fillOpacity={0.1} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
```

- [ ] **Step 33: Run the test again**

Run: `pnpm vitest run src/ui/__tests__/Sparkline.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 34: Move Sparkline out of `WebAnalyticsView`**

The view keeps rendering until the Web analytics task deletes it. From here on it draws the shared sparkline at the same size, with the line at full strength.

In `src/tools/analytics/WebAnalyticsView.tsx`, lines 1–3. Before:

```tsx
import {useState} from 'react';
import {COLORS, EASING, FONT_SIZES, FONTS, INK_COLORS, RADIUS, SPACING, hexRgba} from '../../app-bridge';
import type {Breakdown, VercelAnalytics, VercelEvent} from './vercelAnalyticsTypes';
```

After (`hexRgba` stays because `BreakdownBlock` uses it):

```tsx
import {useState} from 'react';
import {COLORS, EASING, FONT_SIZES, FONTS, INK_COLORS, RADIUS, SPACING, hexRgba} from '../../app-bridge';
import {Sparkline} from '../../ui/Sparkline';
import type {Breakdown, VercelAnalytics, VercelEvent} from './vercelAnalyticsTypes';
```

Delete lines 58–89, which hold the local component and the blank line after it. `BreakdownBlock`'s doc comment then follows the `STYLES` block after a single blank line.

```tsx
/** Slim line sparkline with a faint area fill; stretches to its container width. */
function Sparkline({data}: {data: number[]}) {
  if (data.length < 2) return null;
  const H = 56;
  const W = 100;
  const max = Math.max(1, ...data);
  const stepX = W / (data.length - 1);
  const pts = data.map((v, i) => `${(i * stepX).toFixed(2)},${(H - 4 - (v / max) * (H - 8)).toFixed(2)}`);
  const line = pts.join(' ');
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{display: 'block', marginTop: SPACING.md}}>
      <polygon points={`0,${H} ${line} ${W},${H}`} fill={hexRgba(COLORS.primary, 0.1)} />
      <polyline
        points={line}
        fill="none"
        stroke={COLORS.primary}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.7}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

```

At the call site in `EventDetail` (line 128 before the deletion). Before:

```tsx
      {event.trend.length >= 2 && <Sparkline data={event.trend.map((t) => t.count)} />}
```

After (the old svg's top margin moves to a wrapper):

```tsx
      {event.trend.length >= 2 && (
        <div style={{marginTop: SPACING.md}}>
          <Sparkline data={event.trend.map((t) => t.count)} />
        </div>
      )}
```

- [ ] **Step 35: Run every new test, plus the view the move touched**

Run: `pnpm vitest run src/ui src/tools/analytics/__tests__/WebAnalyticsView.test.tsx`
Expected: PASS: 10 files under `src/ui/__tests__` (62 tests), plus `WebAnalyticsView.test.tsx` (2 tests).

- [ ] **Step 36: Write the stories, `src/ui/Primitives.stories.tsx`**

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {FONTS, LinkButton, SPACING} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';
import {BiasBar} from './BiasBar';
import {fmtGap, fmtInt} from './format';
import {KpiCard} from './KpiCard';
import {MeterBar} from './MeterBar';
import {Notice} from './Notice';
import {Panel} from './Panel';
import {RawTag} from './RawTag';
import {ScorePill} from './ScorePill';
import {SegmentedControl} from './SegmentedControl';
import {Sparkline} from './Sparkline';

const meta: Meta = {
  title: 'Admin/UI/Primitives',
  parameters: {layout: 'fullscreen'},
  // The admin page: its background, text colour and body font. The adm-* classes
  // SegmentedControl relies on come from .storybook/preview.tsx, which mounts
  // AdminStyles for every story.
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: '100vh',
          padding: SPACING.xxxl,
          background: ADMIN_COLORS.page,
          color: ADMIN_COLORS.text,
          fontFamily: FONTS.body,
        }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj;

/** One column with the page body's rhythm. */
function Stack({children}: {children: React.ReactNode}) {
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xl, maxWidth: 960}}>{children}</div>
  );
}

export const KpiCards: Story = {
  render: () => (
    <div
      style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: SPACING.md, maxWidth: 960}}>
      <KpiCard label="Total votes" value={fmtInt(2054)} hint="all-time" />
      <KpiCard label="Pairs covered" value={fmtInt(1928)} hint="distinct card pairs" />
      <KpiCard label="Distinct voters" value={fmtInt(114)} hint="from raw vote log" tag={<RawTag />} />
      <KpiCard label="Engine-silent pairs" value={fmtInt(196)} hint="voted, no synergy" valueColor={ADMIN_COLORS.accent} />
    </div>
  ),
};

const RULES = [
  {name: 'Ramp', gap: -0.57},
  {name: 'Shift targets', gap: 0.83},
  {name: 'Location payoff', gap: -2.9},
  {name: 'Song support', gap: null},
];

const VOTES = [
  {pair: 'Maui × Fishhook', score: 5},
  {pair: 'Elsa - Spirit × Elsa - Snow Queen', score: 8},
  {pair: 'Cogsworth × Beast’s Castle', score: null},
];

const CELL: React.CSSProperties = {padding: `${SPACING.sm}px ${SPACING.lg}px`, textAlign: 'left'};

export const Panels: Story = {
  render: () => (
    <Stack>
      <Panel
        title="Rules to review"
        action={
          <LinkButton type="button" size="sm" onClick={() => {}}>
            Open calibration →
          </LinkButton>
        }>
        {RULES.map((rule) => (
          <div
            key={rule.name}
            style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 120px 56px', gap: SPACING.md, alignItems: 'center'}}>
            <span>{rule.name}</span>
            <BiasBar gap={rule.gap} />
            <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{fmtGap(rule.gap)}</span>
          </div>
        ))}
      </Panel>
      <Panel title="Vote log" action="3 votes · 3 voters" padded={false}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{color: ADMIN_COLORS.muted}}>
              <th scope="col" style={CELL}>
                Pair
              </th>
              <th scope="col" style={CELL}>
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {VOTES.map((vote) => (
              <tr key={vote.pair} style={{borderTop: `1px solid ${ADMIN_COLORS.divider}`}}>
                <td style={CELL}>{vote.pair}</td>
                <td style={CELL}>
                  <ScorePill score={vote.score} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel>
        <span style={{color: ADMIN_COLORS.muted}}>A panel with no header.</span>
      </Panel>
    </Stack>
  ),
};

type Band = 'all' | 'high' | 'mid' | 'low' | 'unscored';
const BANDS: ReadonlyArray<{value: Band; label: string}> = [
  {value: 'all', label: 'All'},
  {value: 'high', label: '7+'},
  {value: 'mid', label: '5–6'},
  {value: 'low', label: '≤4'},
  {value: 'unscored', label: 'No score'},
];

function SegmentedDemo() {
  const [band, setBand] = useState<Band>('all');
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: SPACING.md}}>
      <SegmentedControl ariaLabel="Score band" options={BANDS} value={band} onChange={setBand} />
      <span style={{color: ADMIN_COLORS.muted}}>Selected: {band}</span>
    </div>
  );
}

export const Segmented: Story = {render: () => <SegmentedDemo />};

const SHARES = [1, 0.62, 0.3, 0.05];
const GAPS = [-4, -1.2, -0.3, 0, null, 0.3, 1.2, 4];

export const Bars: Story = {
  render: () => (
    <Stack>
      <Panel title="MeterBar">
        {SHARES.map((share) => (
          <MeterBar key={share} fraction={share} color={ADMIN_COLORS.accent} label={`${Math.round(share * 100)}%`} />
        ))}
      </Panel>
      <Panel title="BiasBar, full scale ±2.5">
        {GAPS.map((gap) => (
          <div
            key={String(gap)}
            style={{display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr)', gap: SPACING.md, alignItems: 'center'}}>
            <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{fmtGap(gap)}</span>
            <BiasBar gap={gap} />
          </div>
        ))}
      </Panel>
    </Stack>
  ),
};

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 6.5, null];

export const ScorePills: Story = {
  render: () => (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: SPACING.sm}}>
      {SCORES.map((score) => (
        <ScorePill key={String(score)} score={score} />
      ))}
    </div>
  ),
};

export const Notices: Story = {
  render: () => (
    <Stack>
      <Notice>Loading analytics...</Notice>
      <Notice>
        No raw votes yet. Set the <code style={{color: ADMIN_COLORS.accent}}>SUPABASE_SERVICE_ROLE_KEY</code> Actions
        secret, then re-run admin&apos;s Deploy workflow.
      </Notice>
      <Notice tone="error">Could not load vote analytics (vote-analytics.json has not been generated yet).</Notice>
    </Stack>
  ),
};

/** The deterministic sawtooth WebAnalyticsView's stories use. */
const TREND = Array.from({length: 30}, (_, i) => 30 + ((i * 7) % 11));

export const Sparklines: Story = {
  render: () => (
    <Stack>
      <Panel title="Default: accent, 56px">
        <Sparkline data={TREND} />
      </Panel>
      <Panel title="Unselected event card: neutral, 28px">
        <Sparkline data={TREND} color={ADMIN_COLORS.barNeutral} height={28} />
      </Panel>
      <Panel title="One point: renders nothing">
        <Sparkline data={[4]} />
      </Panel>
    </Stack>
  ),
};
```

- [ ] **Step 37: Check the stories in Storybook**

Run `pnpm storybook`, then open `http://localhost:6007` at **Admin/UI/Primitives**. Expected:
- **KpiCards:** the values in Tinos, and "196" in gold.
- **Panels:**
  - The BiasBar fills lean left (red) and right (green) from the centre tick.
  - "Location payoff" (−2.90) fills its half.
  - "Song support" shows only the tick and `—`.
  - The Vote log table runs flush to the panel edges, and the unscored row shows a grey `—` pill.
- **Segmented:** Tab reaches each option, Enter or Space selects it, and AdminStyles draws the selected option.
- **ScorePills:** 1–4 red, 5–6 neutral, 7–10 green, `6.5` neutral, `—` grey.
- **A11y addon:** no violations.

Stop Storybook before committing, because a running server can starve the pre-commit Vitest workers.

- [ ] **Step 38: Lint and typecheck**

Run: `pnpm lint`
Expected: no errors.

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 39: Commit the primitives and the Sparkline move**

Run with the Bash tool, only after the owner approves:
```bash
git add src/ui src/tools/analytics/WebAnalyticsView.tsx
USER_APPROVED=1 git commit -m "feat(ui): add the admin UI primitives and move Sparkline into src/ui (#24)"
```
