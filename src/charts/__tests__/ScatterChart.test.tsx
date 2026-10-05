import {describe, expect, it, vi} from 'vitest';
import {act, fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {ScatterChart, type ScatterPoint} from '../ScatterChart';
import {SCATTER_MAX_WIDTH, placeDots, scatterLayout} from '../scatter';
import type {SeriesDef} from '../series';

// placeDots runs as it is, and counts its calls: the placement test checks the dots are placed once per layout.
vi.mock('../scatter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../scatter')>();
  return {...actual, placeDots: vi.fn(actual.placeDots)};
});

const SERIES: SeriesDef[] = [
  {id: 'low', label: 'Low', color: ADMIN_COLORS.over},
  {id: 'high', label: 'High', color: ADMIN_COLORS.under},
];
const DOMAIN = [0, 10] as const;
const TICKS = [0, 5, 10];
const POINTS: ScatterPoint[] = [
  {key: 'c', x: 8, y: 2, series: 'low', label: 'C at 8, 2'},
  {key: 'a', x: 2, y: 6, series: 'high', label: 'A at 2, 6'},
  {key: 'b', x: 5, y: 5, series: 'high', label: 'B at 5, 5'},
];
// jsdom has no layout: the chart lays out at SCATTER_MAX_WIDTH, and the plot's box starts at 0, 0.
const layout = scatterLayout(SCATTER_MAX_WIDTH, DOMAIN, DOMAIN, TICKS.map(String));
const at = (point: ScatterPoint) => ({clientX: layout.x(point.x), clientY: layout.y(point.y)});

/** The chart with test defaults; any prop can be overridden. */
function Chart(props: Partial<React.ComponentProps<typeof ScatterChart>>) {
  return (
    <ScatterChart
      points={POINTS}
      series={SERIES}
      ariaLabel="Test scatter"
      xDomain={DOMAIN}
      yDomain={DOMAIN}
      xTicks={TICKS}
      yTicks={TICKS}
      xLabel="Across"
      yLabel="Up"
      tooltip={(point) => ({title: `Tip ${point.key}`, rows: []})}
      {...props}
    />
  );
}

const renderChart = (props: Partial<React.ComponentProps<typeof ScatterChart>> = {}) => render(<Chart {...props} />);
const slider = () => screen.getByRole('slider', {name: 'Test scatter'});
const tip = (container: HTMLElement) => container.querySelector('.adm-chart-tip');

describe('ScatterChart: marks', () => {
  it('draws one dot per point in its series colour, in the order given', () => {
    const {container} = renderChart();
    const dots = container.querySelectorAll('circle[data-key]');
    expect(Array.from(dots).map((d) => d.getAttribute('data-key'))).toEqual(['c', 'a', 'b']);
    expect(container.querySelector('circle[data-key="c"]')).toHaveAttribute('fill', ADMIN_COLORS.over);
    expect(container.querySelector('circle[data-key="a"]')).toHaveAttribute('fill', ADMIN_COLORS.under);
  });

  it('draws each r 4 dot on its own opaque r 6 disc in the page colour, with no stroke', () => {
    const {container} = renderChart();
    const dot = container.querySelector('circle[data-key="a"]');
    expect(dot).toHaveAttribute('r', '4');
    expect(dot).not.toHaveAttribute('stroke');
    expect(dot?.previousElementSibling).toHaveAttribute('fill', ADMIN_COLORS.page);
    expect(dot?.previousElementSibling).toHaveAttribute('r', '6');
  });

  it('labels both axes, the ticks and the y = x line, which runs along the diagonal', () => {
    const {container} = renderChart({diagonal: 'Equal'});
    expect(screen.getByText('Across')).toBeInTheDocument();
    expect(screen.getByText('Up')).toBeInTheDocument();
    expect(Array.from(container.querySelectorAll('[data-x-label]')).map((t) => t.textContent)).toEqual(['0', '5', '10']);
    expect(screen.getByText('Equal')).toHaveAttribute('transform', expect.stringMatching(/^rotate\(-45 /));
    // A line's height above the line, clear of the r 6 discs of the dots on it (not −0.4em).
    expect(screen.getByText('Equal')).toHaveAttribute('dy', '-1em');
  });

  it('draws the y = x line under the dots and its label over them, with a page-coloured halo, under the lifted dots', () => {
    // At a two-up width a row of dots reaches the line's top end, where the label runs: it must not draw beneath them.
    const {container} = renderChart({diagonal: 'Equal', selectedKey: 'b'});
    fireEvent.pointerMove(slider(), at(POINTS[0]));
    const line = container.querySelector('[data-diagonal="line"]');
    const label = container.querySelector('[data-diagonal="label"]');
    const dots = Array.from(container.querySelectorAll('circle[data-key]'));
    const after = (a: Element | null, b: Element | null) => Boolean(a && b && a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(after(line, dots[0])).toBe(true);
    expect(after(dots[dots.length - 1], label)).toBe(true);
    expect(after(label, container.querySelector('[data-state="selected"]'))).toBe(true);
    expect(after(label, container.querySelector('[data-state="active"]'))).toBe(true);
    // The halo: 3px of page colour painted under the glyphs, with round joins, so it reads over any dot.
    const text = screen.getByText('Equal');
    expect(text).toHaveAttribute('stroke', ADMIN_COLORS.page);
    expect(text).toHaveAttribute('stroke-width', '3');
    expect(text).toHaveAttribute('stroke-linejoin', 'round');
    expect(text).toHaveAttribute('paint-order', 'stroke');
    expect(text).toHaveAttribute('fill', ADMIN_COLORS.muted);
    // The line itself stays a bare hairline: no halo, no label.
    expect(line?.querySelector('text')).toBeNull();
    expect(line?.querySelector('line')).toHaveAttribute('stroke', ADMIN_COLORS.dim);
  });

  it('turns the y = x label by the angle of the line itself when the domains differ', () => {
    // Half the y span for the same x run: atan(196 / 392), −26.565°, which the chart rounds to 2 places.
    renderChart({diagonal: 'Equal', yDomain: [0, 20], yTicks: [0, 10, 20]});
    expect(screen.getByText('Equal')).toHaveAttribute('transform', expect.stringMatching(/^rotate\(-26\.57 /));
  });

  it('formats both axes with fmtInt by default, so a negative tick reads with a true minus', () => {
    const {container} = renderChart({xDomain: [-5, 5], yDomain: [-5, 5], xTicks: [-5, 0, 5], yTicks: [-5, 0, 5]});
    expect(Array.from(container.querySelectorAll('[data-x-label]')).map((t) => t.textContent)).toEqual(['−5', '0', '5']);
    // The x label and the y label.
    expect(screen.getAllByText('−5')).toHaveLength(2);
  });

  it('calls tickFormat one tick at a time, so an optional second parameter never gets the index', () => {
    const digits = (n: number, places = 0) => n.toFixed(places);
    const {container} = renderChart({tickFormat: digits});
    expect(Array.from(container.querySelectorAll('[data-x-label]')).map((t) => t.textContent)).toEqual(['0', '5', '10']);
    // The left margin sizes from the same labels: a stray index would make "5.0" and "10.00" and move every dot.
    const expected = scatterLayout(SCATTER_MAX_WIDTH, DOMAIN, DOMAIN, ['0', '5', '10']);
    expect(Number(container.querySelector('circle[data-key="a"]')?.getAttribute('cx'))).toBeCloseTo(expected.x(2), 2);
  });

  it('formats both axes and the left margin with a custom tickFormat', () => {
    // fmtInt can't print these, and map's index in `suffix` would print "00", "51" and "102".
    const unit = (n: number, suffix = ' pts') => `${n}${suffix}`;
    const {container} = renderChart({tickFormat: unit});
    expect(Array.from(container.querySelectorAll('[data-x-label]')).map((t) => t.textContent)).toEqual(['0 pts', '5 pts', '10 pts']);
    // The x label and the y label.
    expect(screen.getAllByText('10 pts')).toHaveLength(2);
    // "10 pts" (36px) and the tick gap widen the left margin past its floor, which moves every dot.
    const expected = scatterLayout(SCATTER_MAX_WIDTH, DOMAIN, DOMAIN, ['0 pts', '5 pts', '10 pts']);
    expect(expected.left).toBeGreaterThan(layout.left);
    expect(Number(container.querySelector('circle[data-key="a"]')?.getAttribute('cx'))).toBeCloseTo(expected.x(2), 2);
  });

  it('draws no y = x line without a label for it', () => {
    const {container} = renderChart();
    expect(container.querySelector('[data-diagonal]')).toBeNull();
  });

  it('keeps each dot where it was across renders, jitter included', () => {
    const {container, rerender} = renderChart({jitter: 0.25});
    const cx = container.querySelector('circle[data-key="a"]')?.getAttribute('cx');
    expect(cx).not.toBe(String(layout.x(2)));
    rerender(<Chart points={[...POINTS].reverse()} jitter={0.25} />);
    expect(container.querySelector('circle[data-key="a"]')).toHaveAttribute('cx', cx);
  });

  it('slides a dot along y = x only with diagonal jitter, so its distance from the line barely moves', () => {
    // A pair-style key, as R2's are: a one-character key's two hashes nearly agree, so it would sit on the line either way.
    const points: ScatterPoint[] = [{key: '1|2', x: 5, y: 5, series: 'high', label: 'B at 5, 5'}];
    const pxPerUnit = layout.side / 10;
    /** The dot's offset from its true spot, in data units. */
    const offset = (container: HTMLElement) => {
      const dot = container.querySelector('circle[data-key="1|2"]');
      return {
        dx: (Number(dot?.getAttribute('cx')) - layout.x(5)) / pxPerUnit,
        dy: (layout.y(5) - Number(dot?.getAttribute('cy'))) / pxPerUnit,
      };
    };
    // px() rounds each coordinate to 0.01px, a few ten-thousandths of a unit here.
    const band = 0.35 / 5 + 0.001;
    // The control: the default 'both' spreads this key well off the line.
    const square = renderChart({points, jitter: 0.35});
    const spread = offset(square.container);
    expect(Math.abs(spread.dy - spread.dx)).toBeGreaterThan(band);
    square.unmount();
    const along = renderChart({points, jitter: 0.35, jitterAlong: 'diagonal'});
    const slid = offset(along.container);
    expect(slid.dx).not.toBe(0);
    expect(Math.abs(slid.dy - slid.dx)).toBeLessThanOrEqual(band);
  });

  it('shows the empty text in place of the plot when there are no points', () => {
    const {container} = renderChart({points: [], emptyText: 'No pairs yet.'});
    expect(screen.getByText('No pairs yet.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
});

describe('ScatterChart: pointer', () => {
  it('lifts the dot nearest the pointer, within 24px, and shows its tooltip', () => {
    const {container} = renderChart();
    const b = at(POINTS[2]);
    fireEvent.pointerMove(slider(), {clientX: b.clientX + 20, clientY: b.clientY});
    expect(screen.getByText('Tip b')).toBeInTheDocument();
    const lifted = container.querySelectorAll('[data-state="active"] circle');
    expect(Array.from(lifted).map((c) => [c.getAttribute('r'), c.getAttribute('fill')])).toEqual([
      ['8', ADMIN_COLORS.page],
      ['6', ADMIN_COLORS.under],
    ]);
    fireEvent.pointerMove(slider(), {clientX: b.clientX + 30, clientY: b.clientY - 30});
    expect(tip(container)).toBeNull();
    expect(container.querySelector('[data-state="active"]')).toBeNull();
  });

  it('lets go when a mouse leaves, and keeps a tapped dot when the finger lifts', () => {
    const {container} = renderChart();
    fireEvent.pointerMove(slider(), at(POINTS[1]));
    fireEvent.pointerLeave(slider());
    expect(tip(container)).toBeNull();
    fireEvent.pointerDown(slider(), {...at(POINTS[1]), pointerType: 'touch'});
    fireEvent.pointerLeave(slider(), {pointerType: 'touch'});
    expect(screen.getByText('Tip a')).toBeInTheDocument();
  });

  it('shows no tooltip when a press on empty space focuses the plot', async () => {
    // Focus from the keyboard shows the resting dot; focus from a press keeps what the press found.
    const {container} = renderChart();
    await userEvent.pointer({keys: '[MouseLeft]', target: slider(), coords: {clientX: 1, clientY: 1}});
    expect(slider()).toHaveFocus();
    expect(tip(container)).toBeNull();
  });

  it('selects the dot under a click, and nothing with no dot within 24px', () => {
    const onSelect = vi.fn();
    renderChart({onSelect});
    fireEvent.click(slider(), at(POINTS[0]));
    expect(onSelect).toHaveBeenLastCalledWith('c');
    fireEvent.click(slider(), {clientX: 1, clientY: 1});
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('rings the selected dot in the accent, just outside its lifted disc', () => {
    const {container} = renderChart({selectedKey: 'b'});
    const ring = container.querySelector('[data-state="selected"] circle');
    expect(ring).toHaveAttribute('stroke', ADMIN_COLORS.accent);
    expect(ring).toHaveAttribute('r', '9');
    expect(ring).toHaveAttribute('cx', String(layout.x(5)));
  });
});

describe('ScatterChart: keyboard', () => {
  it('is the kit plot: one named slider that walks the dots left to right and reads each one out', async () => {
    renderChart();
    expect(slider()).toHaveClass('adm-chart-plot');
    expect(slider()).toHaveAttribute('aria-valuemax', '2');
    act(() => slider().focus());
    await userEvent.keyboard('{Home}');
    expect(slider()).toHaveAttribute('aria-valuetext', 'A at 2, 6');
    await userEvent.keyboard('{ArrowRight}');
    expect(slider()).toHaveAttribute('aria-valuetext', 'B at 5, 5');
    await userEvent.keyboard('{End}');
    expect(slider()).toHaveAttribute('aria-valuetext', 'C at 8, 2');
  });

  it('says which dot is selected', async () => {
    renderChart({selectedKey: 'b'});
    act(() => slider().focus());
    await userEvent.keyboard('{Home}{ArrowRight}');
    expect(slider()).toHaveAttribute('aria-valuetext', 'B at 5, 5, selected');
  });

  it('takes a description for its slider, such as how to select a dot', () => {
    render(
      <>
        <Chart describedBy="how-to-pick" />
        <p id="how-to-pick">Press Enter to pick the dot.</p>
      </>,
    );
    expect(slider()).toHaveAccessibleDescription('Press Enter to pick the dot.');
  });

  it('selects the dot the slider announces with Enter or Space, before any arrow key and after Escape', async () => {
    const onSelect = vi.fn();
    const {container} = renderChart({onSelect});
    // Focus from the keyboard shows the resting dot, the newest: the one the slider announces.
    await userEvent.tab();
    expect(tip(container)).toHaveTextContent('Tip c');
    expect(slider()).toHaveAttribute('aria-valuetext', 'C at 8, 2');
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('c');
    // Escape hides the tooltip and keeps the place (the kit's cursor): the slider still announces A, and Space takes it.
    await userEvent.keyboard('{Home}{Escape}');
    expect(tip(container)).toBeNull();
    expect(slider()).toHaveAttribute('aria-valuetext', 'A at 2, 6');
    await userEvent.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith('a');
  });
});

describe('ScatterChart: placement', () => {
  it('places the dots once per layout: hover, the arrow keys and a new selection place none again', async () => {
    const {container, rerender} = renderChart();
    const placed = vi.mocked(placeDots);
    placed.mockClear();
    // The pointer onto each dot in turn, then the keyboard across them: the cursor moves, the dots don't.
    for (const point of POINTS) fireEvent.pointerMove(slider(), at(point));
    expect(screen.getByText('Tip b')).toBeInTheDocument();
    await userEvent.tab();
    await userEvent.keyboard('{Home}{ArrowRight}{ArrowRight}');
    expect(slider()).toHaveAttribute('aria-valuetext', 'C at 8, 2');
    // A new selection moves the ring, and only the ring.
    rerender(<Chart selectedKey="b" />);
    rerender(<Chart selectedKey="a" />);
    expect(container.querySelector('[data-state="selected"] circle')).toHaveAttribute('cx', String(layout.x(2)));
    expect(placed).not.toHaveBeenCalled();
    // The control: a new placing input places them again.
    rerender(<Chart selectedKey="a" jitter={0.25} />);
    expect(placed).toHaveBeenCalled();
  });
});
