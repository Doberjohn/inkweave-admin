import type {ComponentProps} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {LineChart as RealLineChart} from '../../../../charts/LineChart';
import type {ScatterChart as RealScatterChart} from '../../../../charts/ScatterChart';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import {CalibrationScatter} from '../CalibrationScatter';
import {GapHistogram} from '../GapHistogram';
import {WeeklyGapTrend} from '../WeeklyGapTrend';
import {SIX_PAIRS} from '../chartFixtures';
import {SCATTER_JITTER, SCORE_DOMAIN, SCORE_TICKS, gapDomain, type WeeklyGap} from '../chartData';
import {pairId} from '../calibrationModel';

// jsdom has no ResizeObserver, so the real useContainerWidth stays at 0 and the
// charts lay out at their fallback widths. One test gives the histogram a real
// two-up width through this stub; the rest keep 0.
const measured = vi.hoisted(() => ({width: 0}));
vi.mock('../../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useContainerWidth: () => measured.width,
}));

// vi.mock is hoisted and covers the whole file, so the mock records LineChart's
// props and still renders the real chart: every other test keeps the real kit.
const lineProps = vi.hoisted(() => [] as Array<ComponentProps<typeof RealLineChart>>);
vi.mock('../../../../charts/LineChart', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../charts/LineChart')>();
  function RecordingLineChart(props: ComponentProps<typeof actual.LineChart>) {
    lineProps.push(props);
    return <actual.LineChart {...props} />;
  }
  return {...actual, LineChart: RecordingLineChart};
});

// The same for the scatter: the wiring (the line, the jitter, the shared axes) is what CalibrationScatter adds.
const scatterProps = vi.hoisted(() => [] as Array<ComponentProps<typeof RealScatterChart>>);
vi.mock('../../../../charts/ScatterChart', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../charts/ScatterChart')>();
  function RecordingScatterChart(props: ComponentProps<typeof actual.ScatterChart>) {
    scatterProps.push(props);
    return <actual.ScatterChart {...props} />;
  }
  return {...actual, ScatterChart: RecordingScatterChart};
});

beforeEach(() => {
  measured.width = 0;
  lineProps.length = 0;
  scatterProps.length = 0;
});

/** The tooltip showing `title`. ChartTooltip's root is aria-hidden (R1-3b), so it is found by its text. */
function tooltip(title: string): HTMLElement {
  const tip = screen.getByText(title).closest<HTMLElement>('[aria-hidden="true"]');
  expect(tip, `no tooltip around "${title}"`).not.toBeNull();
  return tip as HTMLElement;
}

/** A table row's cells as text, header cells included. */
const cells = (row: HTMLElement) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent);

const PAIRS = [...SIX_PAIRS];
const WEEKS: WeeklyGap[] = [
  {week: '2026-09-14', meanGap: -0.5, scoreVotes: 2},
  {week: '2026-09-21', meanGap: null, scoreVotes: 0},
  {week: '2026-09-28', meanGap: -1, scoreVotes: 3},
];

describe('CalibrationScatter', () => {
  it('reads the leftmost pair, then the shared 7 → 7 spot, and selects it with Enter', async () => {
    const onSelectPair = vi.fn();
    render(<CalibrationScatter pairs={PAIRS} scopeLabel="Ramp" selectedPair={null} onSelectPair={onSelectPair} />);
    const slider = screen.getByRole('slider', {name: 'Engine score against community score, Ramp'});
    act(() => slider.focus());
    await userEvent.keyboard('{Home}');
    expect(tooltip('Card 7 × Card 8')).toHaveTextContent(/\+6\.00\s*gap\s*3\s*engine\s*9\s*community\s*1\s*vote$/);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(tooltip('Card 3 × Card 4')).toHaveTextContent(/2\s*pairs on these scores$/);
    expect(slider).toHaveAttribute(
      'aria-valuetext',
      'Card 3 × Card 4: engine 7, community 7, gap 0.00, 1 vote, 2 pairs on these scores',
    );
    await userEvent.keyboard('{Enter}');
    expect(onSelectPair).toHaveBeenCalledWith({a: '3', b: '4'});
  });

  it('keys the legend with dots', () => {
    const {container} = render(<CalibrationScatter pairs={PAIRS} scopeLabel="Ramp" selectedPair={null} onSelectPair={vi.fn()} />);
    const legend = screen.getByRole('list', {name: 'Legend'});
    expect(within(legend).getAllByRole('listitem')).toHaveLength(3);
    expect(legend.querySelectorAll('circle')).toHaveLength(3);
    expect(container.querySelectorAll('circle[data-key]')).toHaveLength(6);
  });

  it('says what an empty scope holds, by default and when the workspace names the rule', () => {
    const {rerender} = render(<CalibrationScatter pairs={[]} scopeLabel="All pairs" selectedPair={null} onSelectPair={vi.fn()} />);
    expect(screen.getByText('No voted pairs yet.')).toBeInTheDocument();
    expect(screen.getByText('All pairs · no pairs')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', {name: 'Legend'})).not.toBeInTheDocument();
    rerender(
      <CalibrationScatter
        pairs={[]}
        scopeLabel="Ramp"
        selectedPair={null}
        onSelectPair={vi.fn()}
        emptyText="No voted pairs for this rule yet."
      />,
    );
    expect(screen.getByText('No voted pairs for this rule yet.')).toBeInTheDocument();
  });
});

describe('CalibrationScatter: wiring', () => {
  it('draws the y = x line and spreads dots along it, on the shared 1 to 10 axes', () => {
    const {container} = render(<CalibrationScatter pairs={PAIRS} scopeLabel="Ramp" selectedPair={null} onSelectPair={vi.fn()} />);
    const props = scatterProps.at(-1);
    // Module constants, so the chart gets the same inputs on every render (R2-4a's note on stable inputs).
    expect(props?.xDomain).toBe(SCORE_DOMAIN);
    expect(props?.yDomain).toBe(SCORE_DOMAIN);
    expect(props?.xTicks).toBe(SCORE_TICKS);
    expect(props?.yTicks).toBe(SCORE_TICKS);
    // The note says a dot's height stays within 0.07 of its gap: that holds only when the jitter runs along the line.
    expect(props?.jitter).toBe(SCATTER_JITTER);
    expect(props?.jitterAlong).toBe('diagonal');
    expect(props?.diagonal).toBe('Engine = community');
    expect(container.querySelector('g[data-diagonal="label"] text')).toHaveTextContent('Engine = community');
    expect(screen.getByText('Engine score')).toBeInTheDocument();
    expect(screen.getByText('Community score')).toBeInTheDocument();
  });

  it('keeps the dots it hands the chart when only the selection changes', () => {
    const {rerender} = render(<CalibrationScatter pairs={PAIRS} scopeLabel="Ramp" selectedPair={null} onSelectPair={vi.fn()} />);
    const before = scatterProps.at(-1)?.points;
    rerender(<CalibrationScatter pairs={PAIRS} scopeLabel="Ramp" selectedPair={{a: '3', b: '4'}} onSelectPair={vi.fn()} />);
    // A new selection moves a ring, not the dots: the chart keeps its placement for the same points.
    expect(before).toBeDefined();
    expect(scatterProps.at(-1)?.selectedKey).toBe(pairId('3', '4'));
    expect(scatterProps.at(-1)?.points).toBe(before);
  });
});

describe('CalibrationScatter: scope, selection, table and footnotes', () => {
  it('names the scope and the count', () => {
    render(<CalibrationScatter pairs={PAIRS} scopeLabel="Ramp" selectedPair={null} onSelectPair={vi.fn()} />);
    expect(
      screen.getByText('Ramp · 6 pairs. Above the line, the community scores a pair higher than the engine does.'),
    ).toBeInTheDocument();
  });

  it('rings the selected pair given the other way round, and says it is selected', async () => {
    const {container} = render(
      <CalibrationScatter pairs={PAIRS} scopeLabel="Ramp" selectedPair={{a: '4', b: '3'}} onSelectPair={vi.fn()} />,
    );
    expect(container.querySelector('[data-state="selected"] circle')).toHaveAttribute('stroke');
    const slider = screen.getByRole('slider');
    act(() => slider.focus());
    await userEvent.keyboard('{Home}{ArrowRight}{ArrowRight}');
    expect(slider.getAttribute('aria-valuetext')).toMatch(/, selected$/);
  });

  it('lists every pair in the table, widest gap first, with exact values', async () => {
    render(<CalibrationScatter pairs={PAIRS} scopeLabel="Ramp" selectedPair={null} onSelectPair={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    const table = screen.getByRole('table', {name: 'Every plotted pair, Ramp, widest gap first'});
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(6);
    expect(cells(rows[0])).toEqual(['Card 11 × Card 12', '9', '1', '−8.00', '1']);
    expect(cells(rows[5])).toEqual(['Card 5 × Card 6', '7', '7', '0.00', '2']);
  });

  it('notes the jitter in the chart, and the engine-silent pairs only when given, in both views', async () => {
    const {rerender} = render(<CalibrationScatter pairs={PAIRS} scopeLabel="All pairs" selectedPair={null} onSelectPair={vi.fn()} />);
    expect(screen.getByText(/within 0\.07 of its gap/)).toBeInTheDocument();
    // A keyboard user is told how to pick a dot: Enter on the one the chart reads out.
    expect(screen.getByText(/press Enter on the one the chart reads out, to open its votes/)).toBeInTheDocument();
    expect(screen.queryByText(/Not plotted/)).not.toBeInTheDocument();
    rerender(
      <CalibrationScatter pairs={PAIRS} scopeLabel="All pairs" selectedPair={null} onSelectPair={vi.fn()} engineSilentPairs={2} />,
    );
    expect(screen.getByText(/Not plotted: 2 engine-silent pairs/)).toBeInTheDocument();
    // The table lists plotted pairs only, so it keeps the count of the ones it leaves out.
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    expect(screen.getByText(/Not plotted: 2 engine-silent pairs/)).toBeInTheDocument();
    expect(screen.queryByText(/within 0\.07 of its gap/)).not.toBeInTheDocument();
  });
});

describe('GapHistogram', () => {
  it('reads the −3 bar from the keyboard', async () => {
    render(<GapHistogram pairs={PAIRS} scopeLabel="Ramp" />);
    expect(screen.getByText('Ramp · 33% within ±0.5, 50% engine higher, 17% community higher')).toBeInTheDocument();
    const slider = screen.getByRole('slider', {name: 'Pairs by gap, Ramp'});
    act(() => slider.focus());
    await userEvent.keyboard('{Home}{ArrowRight}{ArrowRight}');
    expect(tooltip('Gap −3.5 to −2.5')).toHaveTextContent(/1\s*pair\s*1\s*vote\s*17%\s*of pairs$/);
    expect(slider).toHaveAttribute('aria-valuetext', 'Gap −3.5 to −2.5: 1 pair, 1 vote, 17% of pairs');
  });

  it('says what an empty scope holds, with a subtitle of no shares', () => {
    render(<GapHistogram pairs={[]} scopeLabel="All pairs" />);
    expect(screen.getByText('No voted pairs yet.')).toBeInTheDocument();
    expect(screen.getByText('All pairs · no pairs')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', {name: 'Legend'})).not.toBeInTheDocument();
  });
});

describe('GapHistogram: bars, labels, table and rule copy', () => {
  it('draws eleven bars from ≤−5 to ≥+5, each in its side colour, and tables every bin', async () => {
    const {container} = render(<GapHistogram pairs={PAIRS} scopeLabel="Ramp" />);
    const labels = [...container.querySelectorAll('[data-x-label]')].map((t) => t.textContent);
    expect(labels).toEqual(['≤−5', '−4', '−3', '−2', '−1', '0', '+1', '+2', '+3', '+4', '≥+5']);
    // −8 folds into ≤−5 (engine higher), the two 0s sit in the centre bin, +6 folds into ≥+5; an empty bin draws nothing.
    const mark = (key: string) => container.querySelector(`[data-key="${key}"] [data-series]`);
    expect(mark('-5')).toHaveAttribute('fill', ADMIN_COLORS.over);
    expect(mark('0')).toHaveAttribute('fill', ADMIN_COLORS.barNeutral);
    expect(mark('5')).toHaveAttribute('fill', ADMIN_COLORS.under);
    expect(mark('4')).toBeNull();
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    const table = screen.getByRole('table');
    expect(table.querySelector('caption')?.textContent).toMatch(/A gap on a half point counts in the bin further from zero\.$/);
    const heads = within(table).getAllByRole('rowheader').map((th) => th.textContent);
    expect(heads).toHaveLength(11);
    expect(heads[0]).toBe('−4.5 or lower');
    expect(heads[5]).toBe('within ±0.5');
    expect(heads[10]).toBe('+4.5 or higher');
  });

  it('prints every bin label two-up in an 800px column, and thins symmetrically below that', () => {
    // Two-up in an 800px column each frame is about 348px: an 11-slot plot of
    // about 300px, so 27px a slot, and "≤−5" needs 26 with its gap. At 300px of
    // frame a slot is 23px, so BarChart keeps every other label, counting back
    // from "≥+5" (R1-3b).
    const labelsAt = (width: number) => {
      measured.width = width;
      const {container, unmount} = render(<GapHistogram pairs={PAIRS} scopeLabel="Ramp" />);
      const labels = [...container.querySelectorAll('[data-x-label]')].map((t) => t.textContent);
      unmount();
      return labels;
    };
    expect(labelsAt(350)).toEqual(['≤−5', '−4', '−3', '−2', '−1', '0', '+1', '+2', '+3', '+4', '≥+5']);
    expect(labelsAt(300)).toEqual(['≤−5', '−3', '−1', '+1', '+3', '≥+5']);
  });

  it('prints no cap label and keys its legend in squares', () => {
    const {container} = render(<GapHistogram pairs={PAIRS} scopeLabel="Ramp" />);
    // The subtitle carries the three shares, so no bar prints a count above it.
    expect(container.querySelectorAll('[data-cap]')).toHaveLength(0);
    const legend = screen.getByRole('list', {name: 'Legend'});
    expect(within(legend).getAllByRole('listitem')).toHaveLength(3);
    expect(legend.querySelectorAll('rect')).toHaveLength(3);
  });

  it('names the rule when the workspace says so', () => {
    render(<GapHistogram pairs={[]} scopeLabel="Ramp" emptyText="No voted pairs for this rule yet." />);
    expect(screen.getByText('No voted pairs for this rule yet.')).toBeInTheDocument();
  });
});

describe('WeeklyGapTrend', () => {
  it('hands the gap plot its labelled baseline, its domain, fixed gutters, no dates and a null for the quiet week', () => {
    const {container} = render(<WeeklyGapTrend weeks={WEEKS} scopeLabel="Ramp" />);
    expect(screen.getByRole('slider', {name: 'Weekly mean gap, Ramp'})).toBeInTheDocument();
    expect(screen.getByRole('slider', {name: 'Score votes per week, Ramp'})).toBeInTheDocument();
    const gap = lineProps.find((p) => p.ariaLabel === 'Weekly mean gap, Ramp');
    expect(gap?.baseline).toBe(0);
    expect(gap?.yDomain).toEqual(gapDomain(WEEKS));
    expect(gap?.fixedGutters).toBe(true);
    expect(gap?.xTicks).toEqual([]);
    expect(gap?.series[0].points[1]).toEqual({x: '2026-09-21', y: null});
    const votes = lineProps.find((p) => p.ariaLabel === 'Score votes per week, Ramp');
    expect(votes?.fixedGutters).toBe(true);
    expect(votes?.xTicks).toBeUndefined();
    expect(container.querySelector('g[data-baseline] text')).toHaveTextContent('No gap');
  });

  it('puts each week at the same x in both plots', () => {
    const {container} = render(<WeeklyGapTrend weeks={WEEKS} scopeLabel="Ramp" />);
    const firstX = (id: string) => container.querySelector(`path[data-series="${id}"]`)?.getAttribute('d')?.match(/^M([\d.]+),/)?.[1];
    const endX = (id: string) => container.querySelector(`circle[data-end="${id}"]`)?.getAttribute('cx');
    expect(firstX('gap')).toBeDefined();
    expect(firstX('votes')).toBe(firstX('gap'));
    expect(endX('gap')).toBeDefined();
    expect(endX('votes')).toBe(endX('gap'));
  });

  it('draws the votes as a neutral area under an accent gap line, and reads each week from the keyboard', async () => {
    const {container} = render(<WeeklyGapTrend weeks={WEEKS} scopeLabel="Ramp" />);
    expect(container.querySelector('path[data-area="votes"]')).toHaveAttribute('fill', ADMIN_COLORS.barNeutral);
    expect(container.querySelector('path[data-series="votes"]')).toHaveAttribute('stroke', ADMIN_COLORS.barNeutral);
    // Only the votes are a wash: the gap is a line against its baseline.
    expect(container.querySelector('path[data-area="gap"]')).toBeNull();
    expect(container.querySelector('path[data-series="gap"]')).toHaveAttribute('stroke', ADMIN_COLORS.accent);
    // Each plot names its weeks in full ("Week of Sep 14", as the activity charts do) and formats its own values.
    const gap = screen.getByRole('slider', {name: 'Weekly mean gap, Ramp'});
    act(() => gap.focus());
    await userEvent.keyboard('{Home}');
    expect(gap).toHaveAttribute('aria-valuetext', 'Week of Sep 14: −0.50 Mean gap');
    await userEvent.keyboard('{ArrowRight}');
    expect(gap).toHaveAttribute('aria-valuetext', 'Week of Sep 21: — Mean gap');
    const votes = screen.getByRole('slider', {name: 'Score votes per week, Ramp'});
    act(() => votes.focus());
    await userEvent.keyboard('{End}');
    expect(votes).toHaveAttribute('aria-valuetext', 'Week of Sep 28: 3 Score votes');
  });

  it('reads the gap axis as +1.00, No gap, −1.00, and the votes axis in whole numbers', () => {
    const {container} = render(<WeeklyGapTrend weeks={WEEKS} scopeLabel="Ramp" />);
    const [gapPlot, votesPlot] = [...container.querySelectorAll('svg')];
    // The zero tick's label gives way to the baseline's, which sits in the gutter at the same y.
    expect([...gapPlot.querySelectorAll('svg > g:not([data-baseline]) > text')].map((t) => t.textContent)).toEqual(['−1.00', '+1.00']);
    expect(gapPlot.querySelector('g[data-baseline] text')).toHaveTextContent('No gap');
    expect([...votesPlot.querySelectorAll('svg > g > text')].map((t) => t.textContent)).toEqual(['0', '3']);
  });

  it('gives a scored week between two quiet ones a dot of its own', () => {
    const lone: WeeklyGap[] = [
      {week: '2026-09-14', meanGap: null, scoreVotes: 0},
      {week: '2026-09-21', meanGap: 1, scoreVotes: 1},
      {week: '2026-09-28', meanGap: null, scoreVotes: 0},
    ];
    const {container} = render(<WeeklyGapTrend weeks={lone} scopeLabel="Ramp" />);
    expect(container.querySelectorAll('circle[data-lone="gap"]')).toHaveLength(1);
  });

  it('says a scope has no score votes when no week has one', () => {
    const quiet = WEEKS.map((w) => ({...w, meanGap: null, scoreVotes: 0}));
    render(<WeeklyGapTrend weeks={quiet} scopeLabel="Locations" />);
    expect(screen.getByText('No score votes in this scope yet.')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('says there are not enough weeks for one week of votes', () => {
    render(<WeeklyGapTrend weeks={WEEKS.slice(0, 1)} scopeLabel="Ramp" />);
    expect(screen.getByText('Not enough weeks of votes to draw a trend yet.')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('captions both plots and tables every week', async () => {
    render(<WeeklyGapTrend weeks={WEEKS} scopeLabel="Ramp" />);
    expect(screen.getByText('Mean gap')).toBeInTheDocument();
    expect(screen.getByText('Score votes')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    const table = screen.getByRole('table', {name: 'Weekly mean gap and score votes, Ramp. Weeks start on Monday (UTC).'});
    const [head, ...rows] = within(table).getAllByRole('row');
    expect(cells(head)).toEqual(['Week of', 'Mean gap', 'Score votes']);
    expect(rows.map(cells)).toEqual([
      ['Sep 14', '−0.50', '2'],
      ['Sep 21', '—', '0'],
      ['Sep 28', '−1.00', '3'],
    ]);
  });
});
