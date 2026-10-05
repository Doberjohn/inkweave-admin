import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {fmtGap} from '../../ui/format';
import {LINE_END_WIDTH, LINE_Y_AXIS_WIDTH, LineChart, type LineSeries} from '../LineChart';
import type {SeriesDef} from '../series';

const DAYS = ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30'];

/** A series with `ys` on `days`; a null leaves that day out, so the line breaks there. */
function seriesOf(def: SeriesDef, ys: Array<number | null>, days = DAYS): LineSeries {
  return {...def, points: ys.flatMap((y, i) => (y == null ? [] : [{x: days[i], y}]))};
}

const SEARCHES = seriesOf({id: 'searches', label: 'Searches', color: ADMIN_COLORS.accent}, [10, 20, 30, 25, 40]);
// No point on Sep 28: the line breaks there.
const VIEWS = seriesOf({id: 'views', label: 'Card views', color: ADMIN_COLORS.under}, [5, 8, null, 12, 18]);

/** jsdom has no layout: the plot's box, at the 640px fallback width. */
function placePlot(plot: HTMLElement) {
  vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 640, 208));
}

function tip(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>('.adm-chart-tip');
}

const texts = (container: HTMLElement, selector: string) =>
  Array.from(container.querySelectorAll(selector)).map((t) => t.textContent);

describe('LineChart: marks', () => {
  it('draws each series as a 2px line in its colour, with an end dot ringed in the surface colour', () => {
    const {container} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    const line = container.querySelector('path[data-series="searches"]');
    expect(line).toHaveAttribute('stroke', ADMIN_COLORS.accent);
    expect(line).toHaveAttribute('stroke-width', '2');
    expect(line).toHaveAttribute('fill', 'none');
    const dot = container.querySelector('circle[data-end="views"]');
    expect(dot).toHaveAttribute('fill', ADMIN_COLORS.under);
    expect(dot).toHaveAttribute('r', '4');
    expect(dot).not.toHaveAttribute('stroke');
    // The 2px ring is the surface, the card over the page: two r 6 discs under the dot.
    const discs = Array.from(dot?.parentElement?.querySelectorAll('circle') ?? []);
    expect(discs.map((c) => [c.getAttribute('r'), c.getAttribute('fill')])).toEqual([
      ['6', ADMIN_COLORS.page],
      ['6', ADMIN_COLORS.card],
      ['4', ADMIN_COLORS.under],
    ]);
  });

  it('breaks a line where its series has no point', () => {
    const {container} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    expect(container.querySelector('path[data-series="views"]')?.getAttribute('d')?.match(/M/g)).toHaveLength(2);
    expect(container.querySelector('path[data-series="searches"]')?.getAttribute('d')?.match(/M/g)).toHaveLength(1);
  });

  it('breaks a lone series at a null value, keeping that x on the axis', async () => {
    const weeks = ['2026-09-07', '2026-09-14', '2026-09-21'];
    const gap: LineSeries = {
      id: 'gap',
      label: 'mean gap',
      color: ADMIN_COLORS.accent,
      points: [
        {x: weeks[0], y: 0.4},
        {x: weeks[1], y: null},
        {x: weeks[2], y: -0.2},
      ],
    };
    const {container} = render(<LineChart series={[gap]} ariaLabel="Weekly gap" yFormat={fmtGap} />);
    expect(container.querySelector('path[data-series="gap"]')?.getAttribute('d')?.match(/M/g)).toHaveLength(2);
    expect(texts(container, '[data-x-label]')).toEqual(['Sep 7', 'Sep 14', 'Sep 21']);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Sep 14: — mean gap');
  });

  it('gives a point with no neighbours a dot of its own', () => {
    // Searches has every day, so Lonely's Sep 26 and Sep 28 stand alone; Sep 30 has its end dot.
    const lonely = seriesOf({id: 'lonely', label: 'Lonely', color: ADMIN_COLORS.under}, [5, null, 7, null, 9]);
    const {container} = render(<LineChart series={[SEARCHES, lonely]} ariaLabel="Events per day" />);
    expect(container.querySelectorAll('circle[data-lone="lonely"]')).toHaveLength(2);
    expect(container.querySelectorAll('circle[data-lone="searches"]')).toHaveLength(0);
  });

  it('draws a one-point series: one end dot, one x label, a one-position slider', () => {
    const one = seriesOf({id: 's', label: 'Searches', color: ADMIN_COLORS.accent}, [5], ['2026-09-30']);
    const {container} = render(<LineChart series={[one]} ariaLabel="Events per day" />);
    expect(container.querySelectorAll('circle[data-end]')).toHaveLength(1);
    expect(container.querySelectorAll('circle[data-lone]')).toHaveLength(0);
    expect(texts(container, '[data-x-label]')).toEqual(['Sep 30']);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '0');
    expect(container.querySelector('path[data-series="s"]')?.getAttribute('d')).not.toMatch(/NaN/);
  });

  it('washes each series down to zero at about 10% only when asked', () => {
    const {container, rerender} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    expect(container.querySelectorAll('path[data-area]')).toHaveLength(0);
    rerender(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" area />);
    const wash = container.querySelector('path[data-area="searches"]');
    expect(wash).toHaveAttribute('fill', ADMIN_COLORS.accent);
    expect(wash).toHaveAttribute('fill-opacity', '0.1');
    // The plot's floor is y 188 (8 + 180): the wash closes along it.
    expect(wash?.getAttribute('d')).toMatch(/^M20,188L20,/);
  });

  it('prints each series’ last value at the right end, unless the labels would collide', () => {
    const {container, rerender} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    expect(texts(container, '[data-end-label]')).toEqual(['40', '18']);
    for (const label of container.querySelectorAll('[data-end-label]')) expect(label).toHaveAttribute('fill', ADMIN_COLORS.text);
    const close = seriesOf({id: 'close', label: 'Close', color: ADMIN_COLORS.under}, [5, 8, 9, 12, 39]);
    rerender(<LineChart series={[SEARCHES, close]} ariaLabel="Events per day" />);
    expect(container.querySelectorAll('[data-end-label]')).toHaveLength(0);
  });

  it('labels the first, quarter and last days by default, or the days it is given', () => {
    const nine = Array.from({length: 9}, (_, i) => `2026-09-0${i + 1}`);
    const s = seriesOf({id: 's', label: 'S', color: ADMIN_COLORS.accent}, [1, 2, 3, 4, 5, 6, 7, 8, 9], nine);
    const {container, rerender} = render(<LineChart series={[s]} ariaLabel="Events per day" />);
    expect(texts(container, '[data-x-label]')).toEqual(['Sep 1', 'Sep 3', 'Sep 5', 'Sep 7', 'Sep 9']);
    rerender(<LineChart series={[s]} ariaLabel="Events per day" xTicks={['2026-09-02', '2026-09-09', 'not here']} />);
    expect(texts(container, '[data-x-label]')).toEqual(['Sep 2', 'Sep 9']);
  });

  it('keeps any x that is not a day in the order given', () => {
    const rounds: LineSeries = {
      id: 'r',
      label: 'Votes',
      color: ADMIN_COLORS.accent,
      points: [
        {x: 'W1', y: 3},
        {x: 'W2', y: 5},
        {x: 'W10', y: 4},
      ],
    };
    const {container} = render(<LineChart series={[rounds]} ariaLabel="Votes per round" />);
    expect(texts(container, '[data-x-label]')).toEqual(['W1', 'W2', 'W10']);
  });

  it('shows the empty text in place of the plot when there are no points', () => {
    const {container} = render(
      <LineChart series={[{...SEARCHES, points: []}]} ariaLabel="Events per day" emptyText="No events in the window." />,
    );
    expect(screen.getByText('No events in the window.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });
});

describe('LineChart: axis and baseline', () => {
  it('runs the y axis from 0 to a clean top', () => {
    const {container} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    expect(texts(container, 'svg > g > text')).toEqual(['0', '20', '40']);
  });

  it('charts an all-zero series on a bare 0 to 1 axis', () => {
    const {container} = render(
      <LineChart
        series={[seriesOf({id: 'z', label: 'Searches', color: ADMIN_COLORS.accent}, [0, 0, 0, 0, 0])]}
        ariaLabel="Events per day"
      />,
    );
    expect(texts(container, 'svg > g > text')).toEqual(['0', '1']);
  });

  it('spans zero for signed data and draws a labelled baseline', () => {
    const gaps = seriesOf({id: 'gap', label: 'Mean gap', color: ADMIN_COLORS.accent}, [-0.5, 0.3, 1.2]);
    const {container} = render(
      <LineChart series={[gaps]} ariaLabel="Weekly gap" yFormat={fmtGap} baseline={0} baselineLabel="No gap" />,
    );
    expect(texts(container, 'svg > g:not([data-baseline]) > text')).toEqual(['−0.50', '0.00', '+1.20']);
    const baseline = container.querySelector('g[data-baseline]');
    expect(baseline?.querySelector('line')).toHaveAttribute('stroke', ADMIN_COLORS.strongBorder);
    expect(baseline?.querySelector('text')).toHaveTextContent('No gap');
  });

  it('labels the baseline with its value by default, and keeps an all-negative axis on whole numbers', () => {
    const drop = seriesOf({id: 'drop', label: 'Drop', color: ADMIN_COLORS.over}, [-3, -1]);
    const {container} = render(<LineChart series={[drop]} ariaLabel="Drop" baseline={0} />);
    expect(texts(container, 'svg > g:not([data-baseline]) > text')).toEqual(['−3', '0']);
    expect(container.querySelector('g[data-baseline] text')).toHaveTextContent('0');
  });

  it('spans a fixed y domain, so signed data that leans one way keeps its ticks apart', () => {
    // On its own, −0.05 to 1.2 gets ticks at −0.05 and 0, about 7px apart, and their labels collide.
    const lopsided = seriesOf({id: 'gap', label: 'Mean gap', color: ADMIN_COLORS.accent}, [-0.05, 0.3, 1.2]);
    const {container} = render(
      <LineChart series={[lopsided]} ariaLabel="Weekly gap" yFormat={fmtGap} baseline={0} yDomain={[-1.5, 1.5]} />,
    );
    expect(texts(container, 'svg > g:not([data-baseline]) > text')).toEqual(['−1.50', '0.00', '+1.50']);
  });

  it('puts each x at the same px in two charts with fixed gutters, whatever their labels need', () => {
    // On their own, "−0.50" needs a wider gutter than "120", so the same day would sit at two xs.
    const gaps = seriesOf({id: 'gap', label: 'Mean gap', color: ADMIN_COLORS.accent}, [-0.5, 0.3, 1.2]);
    const votes = seriesOf({id: 'votes', label: 'Score votes', color: ADMIN_COLORS.barNeutral}, [12, 45, 120]);
    const gap = render(<LineChart series={[gaps]} ariaLabel="Gap" yFormat={fmtGap} fixedGutters />).container;
    const vote = render(<LineChart series={[votes]} ariaLabel="Votes" fixedGutters />).container;
    const firstX = (container: HTMLElement, id: string) =>
      container.querySelector(`path[data-series="${id}"]`)?.getAttribute('d')?.split(',')[0];
    const endX = (container: HTMLElement, id: string) => container.querySelector(`circle[data-end="${id}"]`)?.getAttribute('cx');
    expect(firstX(gap, 'gap')).toBe(`M${LINE_Y_AXIS_WIDTH}`);
    expect(firstX(vote, 'votes')).toBe(`M${LINE_Y_AXIS_WIDTH}`);
    // The 640px fallback width, less the right gutter.
    expect(endX(gap, 'gap')).toBe(String(640 - LINE_END_WIDTH));
    expect(endX(vote, 'votes')).toBe(String(640 - LINE_END_WIDTH));
  });
});

describe('LineChart: crosshair, tooltip and keyboard', () => {
  it('snaps the crosshair to the nearest day and lists every series there', () => {
    const {container} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    const slider = screen.getByRole('slider', {name: 'Events per day'});
    placePlot(slider);
    // Days sit at x 20, 169.5, 319, 468.5 and 618: 359 is nearest Sep 28.
    fireEvent.pointerMove(slider, {clientX: 359});

    expect(container.querySelector('[data-cursor]')).toHaveAttribute('data-cursor', '2');
    const shown = tip(container)!;
    expect(within(shown).getByText('Sep 28')).toBeInTheDocument();
    expect(shown).toHaveTextContent(/30Searches—Card views$/);
    // A marker rides each series that has a point there.
    expect(container.querySelectorAll('circle[data-marker]')).toHaveLength(1);

    fireEvent.pointerMove(slider, {clientX: 600});
    expect(container.querySelector('[data-cursor]')).toHaveAttribute('data-cursor', '4');
    expect(container.querySelectorAll('circle[data-marker]')).toHaveLength(2);

    fireEvent.pointerLeave(slider);
    expect(tip(container)).toBeNull();
    expect(container.querySelector('[data-cursor]')).toBeNull();
  });

  it('places days by time, so a gap in the dates keeps its width', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-10'];
    const s = seriesOf({id: 's', label: 'Searches', color: ADMIN_COLORS.accent}, [1, 2, 3], days);
    const {container} = render(<LineChart series={[s]} ariaLabel="Events per day" />);
    const slider = screen.getByRole('slider');
    placePlot(slider);
    // 60% across the plot is nearer Sep 10 (the right end) than Sep 2 (1/9 of the way).
    fireEvent.pointerMove(slider, {clientX: 380});
    expect(within(tip(container)!).getByText('Sep 10')).toBeInTheDocument();
  });

  it('walks the days with the keyboard, reading the same text as the tooltip', async () => {
    const {container} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuetext', 'Sep 30: 40 Searches, 18 Card views');

    await userEvent.tab();
    expect(within(tip(container)!).getByText('Sep 30')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}');
    expect(slider).toHaveAttribute('aria-valuetext', 'Sep 29: 25 Searches, 12 Card views');
    await userEvent.keyboard('{ArrowLeft}');
    expect(slider).toHaveAttribute('aria-valuetext', 'Sep 28: 30 Searches, — Card views');
    await userEvent.keyboard('{Home}');
    expect(within(tip(container)!).getByText('Sep 26')).toBeInTheDocument();
    await userEvent.keyboard('{End}');
    expect(container.querySelector('[data-cursor]')).toHaveAttribute('data-cursor', '4');
  });

  it('keys each tooltip row with its series colour', async () => {
    const {container} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    await userEvent.tab();
    const shown = tip(container)!;
    expect(within(shown).getByText('40').previousElementSibling).toHaveStyle({background: ADMIN_COLORS.accent});
    expect(within(shown).getByText('18').previousElementSibling).toHaveStyle({background: ADMIN_COLORS.under});
  });
});
