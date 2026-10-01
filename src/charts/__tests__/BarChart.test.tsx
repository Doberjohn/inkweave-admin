import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {BAR_Y_AXIS_WIDTH, BarChart, type BarDatum} from '../BarChart';
import type {SeriesDef} from '../series';

const BANDS: SeriesDef[] = [
  {id: 'high', label: '7+', color: ADMIN_COLORS.under},
  {id: 'mid', label: '5–6', color: ADMIN_COLORS.barNeutral},
  {id: 'unscored', label: 'No score', color: ADMIN_COLORS.muted, pattern: 'hatch'},
];

// Totals 5, 37, 12 and 9: the axis tops out at 40 (ticks 0, 20, 40).
const DAYS: BarDatum[] = [
  {key: '2026-09-27', label: 'Sep 27', values: {high: 3, mid: 2}},
  {key: '2026-09-28', label: 'Sep 28', values: {high: 20, mid: 10, unscored: 7}},
  {key: '2026-09-29', label: 'Sep 29', values: {high: 6, mid: 4, unscored: 2}},
  {key: '2026-09-30', label: 'Sep 30', values: {high: 5, mid: 3, unscored: 1}},
];

function total(d: BarDatum): number {
  return Object.values(d.values).reduce((sum, v) => sum + v, 0);
}

const tooltip = (d: BarDatum) => ({
  title: d.label,
  rows: [
    {label: 'votes', value: String(total(d))},
    {label: 'rated 7+', value: String(d.values.high ?? 0), color: ADMIN_COLORS.under},
  ],
});

/** `count` days of September 2026, from the 1st, with `values` on each. */
function september(count: number, values: (i: number) => Record<string, number> = () => ({high: 1})): BarDatum[] {
  return Array.from({length: count}, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    return {key: `2026-09-${day}`, label: `Sep ${i + 1}`, values: values(i)};
  });
}

function bar(container: HTMLElement, key: string): SVGGElement {
  const g = container.querySelector<SVGGElement>(`g[data-key="${key}"]`);
  expect(g, key).not.toBeNull();
  return g!;
}

function segment(container: HTMLElement, key: string, series: string): SVGElement {
  const el = bar(container, key).querySelector<SVGElement>(`[data-series="${series}"]`);
  expect(el, `${key} ${series}`).not.toBeNull();
  return el!;
}

const num = (el: Element, attr: string) => Number(el.getAttribute(attr));
/** The y where a rounded-top path starts: its bottom edge. */
const pathBottom = (el: Element) => Number(/^M[\d.]+,([\d.]+)/.exec(el.getAttribute('d') ?? '')?.[1]);
const texts = (container: HTMLElement, selector: string) =>
  Array.from(container.querySelectorAll(selector)).map((t) => t.textContent);

/** jsdom has no layout: the plot's box, at the 640px fallback width. */
function placePlot(plot: HTMLElement) {
  vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 640, 196));
}

/** A bar's centre, from its drawn segments. */
function centreOf(container: HTMLElement, key: string): number {
  const first = bar(container, key).querySelector('rect');
  return num(first!, 'x') + num(first!, 'width') / 2;
}

function tip(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>('.adm-chart-tip');
}

describe('BarChart: marks', () => {
  it('stacks the series from the baseline up, with a 2px surface gap between segments', () => {
    const {container} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    const high = segment(container, '2026-09-28', 'high');
    const mid = segment(container, '2026-09-28', 'mid');
    const unscored = segment(container, '2026-09-28', 'unscored');

    // The plot runs from y 16 to the baseline at 176 (160px), topped at 40.
    expect(num(high, 'y') + num(high, 'height')).toBe(176);
    expect(num(high, 'height')).toBe(80); // 20 of 37, in a 148px bar
    expect(num(mid, 'y') + num(mid, 'height')).toBe(num(high, 'y') - 2);
    expect(pathBottom(unscored)).toBe(num(mid, 'y') - 2);
    expect(unscored.getAttribute('d')).toMatch(/V32A4,4 0 0 1/); // tops out at 28 = 176 − 148
  });

  it('rounds only the data end, 4px, and keeps bars at most 24px thick', () => {
    const {container} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    const g = bar(container, '2026-09-27');
    expect(g.querySelectorAll('rect')).toHaveLength(1);
    expect(g.querySelector('rect')).not.toHaveAttribute('rx');
    expect(g.querySelector('path')?.getAttribute('d')).toContain('A4,4');
    expect(num(g.querySelector('rect')!, 'width')).toBe(24);
  });

  it('fills a hatched series with its pattern', () => {
    const {container} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    const pattern = container.querySelector('defs pattern');
    expect(pattern).not.toBeNull();
    expect(pattern).toHaveAttribute('patternTransform', 'rotate(45)');
    expect(pattern!.querySelector('rect')).toHaveAttribute('fill', ADMIN_COLORS.muted);
    expect(segment(container, '2026-09-28', 'unscored')).toHaveAttribute('fill', `url(#${pattern!.id})`);
    expect(segment(container, '2026-09-28', 'high')).toHaveAttribute('fill', ADMIN_COLORS.under);
  });

  it('draws a clean axis: hairline grid and muted ticks at 0, 20 and 40', () => {
    const {container} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    const ticks = Array.from(container.querySelectorAll('svg > g > text')).filter((t) => !t.hasAttribute('data-x-label'));
    expect(ticks.map((t) => t.textContent)).toEqual(['0', '20', '40']);
    for (const t of ticks) expect(t).toHaveAttribute('fill', ADMIN_COLORS.muted);
    const grid = container.querySelectorAll('svg > g > line');
    expect(grid).toHaveLength(3);
    for (const line of grid) expect(line).toHaveAttribute('stroke-width', '1');
  });

  it('starts the plot after a fixed 40px y-axis gutter, which a wider tick label widens', () => {
    const {container, rerender} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    expect(BAR_Y_AXIS_WIDTH).toBe(40);
    expect(container.querySelector('svg > g > line')).toHaveAttribute('x1', '40');
    // "40,000" needs 36px plus the 8px gap, so the gutter grows rather than clip it.
    rerender(<BarChart data={september(3, () => ({high: 40000}))} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    expect(container.querySelector('svg > g > line')).toHaveAttribute('x1', '44');
  });

  it('charts all zeros as an empty 0 to 1 axis, with no marks and no cap labels', () => {
    const {container} = render(
      <BarChart data={september(5, () => ({high: 0}))} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />,
    );
    expect(container.querySelectorAll('[data-series]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-cap]')).toHaveLength(0);
    expect(texts(container, 'svg > g > text:not([data-x-label])')).toEqual(['0', '1']);
  });

  it('centres a single bar and prints its total', () => {
    const {container} = render(
      <BarChart data={[DAYS[1]]} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />,
    );
    // left gutter 40, plot 592 wide: the centre is at 336.
    expect(centreOf(container, '2026-09-28')).toBe(336);
    expect(texts(container, '[data-cap]')).toEqual(['37']);
  });

  it('shows the empty text in place of the plot when there is no data', () => {
    const {container} = render(
      <BarChart data={[]} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} emptyText="No votes in this range." />,
    );
    expect(screen.getByText('No votes in this range.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
});

describe('BarChart: labels', () => {
  it('prints the totals of the last and the highest bar by default', () => {
    const {container} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    expect(texts(container, '[data-cap]')).toEqual(['37', '9']);
    for (const cap of container.querySelectorAll('[data-cap]')) expect(cap).toHaveAttribute('fill', ADMIN_COLORS.muted);
  });

  it('prints every total, or none, when asked', () => {
    const {container, rerender} = render(
      <BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} capLabels="all" />,
    );
    expect(texts(container, '[data-cap]')).toEqual(['5', '37', '12', '9']);
    rerender(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} capLabels="none" />);
    expect(container.querySelectorAll('[data-cap]')).toHaveLength(0);
  });

  it('drops the highest total when it would collide with the last one', () => {
    const data = september(30, (i) => ({high: i === 28 ? 4000 : i === 29 ? 3999 : 0}));
    const {container} = render(<BarChart data={data} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    expect(texts(container, '[data-cap]')).toEqual(['3,999']);
  });

  it('prints every nth x label counting back from the newest', () => {
    const {container} = render(
      <BarChart data={september(6)} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} xLabelEvery={2} />,
    );
    expect(texts(container, '[data-x-label]')).toEqual(['Sep 2', 'Sep 4', 'Sep 6']);
  });

  it('thins the x labels further when they would not fit, keeping the newest', () => {
    const {container, rerender} = render(
      <BarChart data={september(30)} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />,
    );
    // 30 bars in 592px leave 19.7px a bar; a 6-character label needs 44px, so every third prints.
    expect(texts(container, '[data-x-label]')).toEqual([
      'Sep 3', 'Sep 6', 'Sep 9', 'Sep 12', 'Sep 15', 'Sep 18', 'Sep 21', 'Sep 24', 'Sep 27', 'Sep 30',
    ]);
    rerender(<BarChart data={september(30)} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} xLabelEvery={5} />);
    expect(texts(container, '[data-x-label]')).toEqual(['Sep 5', 'Sep 10', 'Sep 15', 'Sep 20', 'Sep 25', 'Sep 30']);
  });

  it('puts a sub-label under each x label, in the colour it is given', () => {
    const {container} = render(
      <BarChart
        data={september(3)}
        series={BANDS}
        ariaLabel="Weekly votes"
        tooltip={tooltip}
        subLabel={(d) => (d.key === '2026-09-02' ? null : {text: d.key === '2026-09-03' ? '−0.30' : '+0.83', color: d.key === '2026-09-03' ? ADMIN_COLORS.over : undefined})}
      />,
    );
    const subs = Array.from(container.querySelectorAll('[data-sub-label]'));
    expect(subs.map((t) => t.textContent)).toEqual(['+0.83', '−0.30']);
    expect(subs[0]).toHaveAttribute('fill', ADMIN_COLORS.muted);
    expect(subs[1]).toHaveAttribute('fill', ADMIN_COLORS.over);
  });

  it('draws one series in emphasis: the picked bar in the accent, the rest neutral', () => {
    const weeks = september(4, (i) => ({votes: 10 + i}));
    const {container} = render(
      <BarChart
        data={weeks}
        series={[{id: 'votes', label: 'Votes', color: ADMIN_COLORS.barNeutral}]}
        ariaLabel="Weekly votes"
        tooltip={tooltip}
        emphasisKey="2026-09-04"
      />,
    );
    expect(segment(container, '2026-09-04', 'votes')).toHaveAttribute('fill', ADMIN_COLORS.accent);
    for (const key of ['2026-09-01', '2026-09-02', '2026-09-03']) {
      expect(segment(container, key, 'votes')).toHaveAttribute('fill', ADMIN_COLORS.barNeutral);
    }
    expect(container.querySelector('[data-cap="2026-09-04"]')).toHaveAttribute('fill', ADMIN_COLORS.text);
  });
});

describe('BarChart: hover and keyboard without onSelect', () => {
  it('is one slider, valued at the newest bar with the tooltip text', () => {
    render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    const slider = screen.getByRole('slider', {name: 'Votes per day'});
    expect(slider).toHaveAttribute('aria-valuetext', 'Sep 30: 9 votes, 5 rated 7+');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the tooltip of the bar under the pointer, washes its column and lifts it', () => {
    const {container} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    const slider = screen.getByRole('slider');
    placePlot(slider);
    fireEvent.pointerMove(slider, {clientX: centreOf(container, '2026-09-28') + 30});

    const shown = tip(container);
    expect(shown).not.toBeNull();
    expect(within(shown!).getByText('Sep 28')).toBeInTheDocument();
    expect(within(shown!).getByText('37')).toBeInTheDocument();
    expect(bar(container, '2026-09-28')).toHaveAttribute('data-active', 'true');
    expect(bar(container, '2026-09-27')).not.toHaveAttribute('data-active');
    expect(container.querySelector('[data-wash]')).not.toBeNull();

    fireEvent.pointerLeave(slider);
    expect(tip(container)).toBeNull();
    expect(container.querySelector('[data-wash]')).toBeNull();
  });

  it('gives the keyboard the same tooltip', async () => {
    const {container} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    await userEvent.tab();
    expect(within(tip(container)!).getByText('Sep 30')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}');
    expect(within(tip(container)!).getByText('Sep 29')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Sep 29: 12 votes, 6 rated 7+');
    await userEvent.keyboard('{Home}');
    expect(within(tip(container)!).getByText('Sep 27')).toBeInTheDocument();
  });
});

describe('BarChart: selectable bars', () => {
  function Selectable({onSelect}: {onSelect: (key: string | null) => void}) {
    const [picked, setPicked] = useState<string | null>(null);
    return (
      <BarChart
        data={DAYS}
        series={BANDS}
        ariaLabel="Votes per day"
        tooltip={tooltip}
        selectedKey={picked}
        onSelect={(key) => {
          setPicked(key);
          onSelect(key);
        }}
      />
    );
  }

  it('makes each bar a toggle button named by its tooltip text', () => {
    render(<Selectable onSelect={() => {}} />);
    const group = screen.getByRole('group', {name: 'Votes per day'});
    expect(within(group).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Sep 27: 5 votes, 3 rated 7+',
      'Sep 28: 37 votes, 20 rated 7+',
      'Sep 29: 12 votes, 6 rated 7+',
      'Sep 30: 9 votes, 5 rated 7+',
    ]);
    for (const b of within(group).getAllByRole('button')) expect(b).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('toggles a bar on and off, dimming the others while one is picked', async () => {
    const onSelect = vi.fn();
    const {container} = render(<Selectable onSelect={onSelect} />);
    const sep28 = screen.getByRole('button', {name: /^Sep 28:/});

    await userEvent.click(sep28);
    expect(onSelect).toHaveBeenLastCalledWith('2026-09-28');
    expect(sep28).toHaveAttribute('aria-pressed', 'true');
    expect(bar(container, '2026-09-28')).not.toHaveAttribute('data-dim');
    expect(bar(container, '2026-09-27')).toHaveAttribute('data-dim', 'true');

    await userEvent.click(sep28);
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(sep28).toHaveAttribute('aria-pressed', 'false');
    expect(bar(container, '2026-09-27')).not.toHaveAttribute('data-dim');
  });

  it('has one Tab stop and moves between bars with the arrow keys, Home and End', async () => {
    const onSelect = vi.fn();
    const {container} = render(<Selectable onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.tabIndex)).toEqual([-1, -1, -1, 0]);

    await userEvent.tab();
    expect(buttons[3]).toHaveFocus();
    expect(within(tip(container)!).getByText('Sep 30')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}');
    expect(buttons[2]).toHaveFocus();
    expect(within(tip(container)!).getByText('Sep 29')).toBeInTheDocument();
    await userEvent.keyboard('{Home}');
    expect(buttons[0]).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(buttons[0]).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(buttons[3]).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('2026-09-29');
    expect(buttons.map((b) => b.tabIndex)).toEqual([-1, -1, 0, -1]);

    await userEvent.keyboard('{Escape}');
    expect(tip(container)).toBeNull();
    await userEvent.tab();
    expect(tip(container)).toBeNull();
  });

  it('shows a bar’s tooltip on hover', () => {
    const {container} = render(<Selectable onSelect={() => {}} />);
    fireEvent.pointerEnter(screen.getByRole('button', {name: /^Sep 27:/}));
    expect(within(tip(container)!).getByText('Sep 27')).toBeInTheDocument();
    fireEvent.pointerLeave(screen.getByRole('group', {name: 'Votes per day'}));
    expect(tip(container)).toBeNull();
  });
});
