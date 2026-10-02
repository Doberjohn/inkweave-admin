import type {ComponentProps} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {BAR_Y_AXIS_WIDTH} from '../../../../charts/BarChart';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import {WeeklyCard} from '../WeeklyCard';
import {ANALYTICS, EARLY_ANALYTICS} from '../overviewFixtures';

// jsdom has no ResizeObserver, so the real useContainerWidth stays at 0. The
// stub gives the card a width, and BarChart the same one if it measures
// through the bridged hook too.
const measured = vi.hoisted(() => ({width: 600}));
vi.mock('../../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useContainerWidth: () => measured.width,
}));

beforeEach(() => {
  // 600px holds all 12 slots (weeksThatFit), with room for BarChart's y-axis gutter.
  measured.width = 600;
});

type CardProps = Partial<ComponentProps<typeof WeeklyCard>>;

function renderCard(props: CardProps = {}) {
  return render(<WeeklyCard weekly={ANALYTICS.global.weekly} hasRawVotes latestDay="2026-09-30" {...props} />);
}

/** The plot: useChartCursor's slider, named by BarChart's ariaLabel (R1-3b). */
const chart = () => screen.getByRole('slider', {name: 'Votes per week'});

/** The tooltip showing `title`. ChartTooltip's root is aria-hidden (R1-3b), so it is found by its text. */
function tooltip(title: string): HTMLElement {
  const tip = screen.getByText(title).closest<HTMLElement>('[aria-hidden="true"]');
  expect(tip, `no tooltip around "${title}"`).not.toBeNull();
  return tip as HTMLElement;
}

/** A table row's cells as text, header cells included. */
const cells = (row: HTMLElement) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent);

/** The sub-label printed under the x label `day`, or null when the week has none. */
function subLabelUnder(container: HTMLElement, day: string): Element | null {
  const label = [...container.querySelectorAll('[data-x-label]')].find((t) => t.textContent === day);
  expect(label, `no x label "${day}"`).toBeDefined();
  return label!.parentElement!.querySelector('[data-sub-label]');
}

describe('WeeklyCard', () => {
  it('reads a week from the keyboard: the votes, then the mean gap', async () => {
    const user = userEvent.setup();
    renderCard();
    expect(screen.queryByText(/^Week of /)).not.toBeInTheDocument();
    // Before the first move the slider already has a value; only the tooltip waits for one.
    expect(chart()).toHaveAttribute('aria-valuenow');

    act(() => chart().focus());
    await user.keyboard('{End}');
    // Title first, then each row: the value leads and its label follows.
    expect(tooltip('Week of Sep 28')).toHaveTextContent(/Week of Sep 28\s*260\s*Votes\s*−0\.30\s*Mean gap/);
    // Screen readers get the same text as the slider's value.
    expect(chart()).toHaveAttribute('aria-valuetext', expect.stringMatching(/Week of Sep 28.*260.*−0\.30/));

    await user.keyboard('{ArrowLeft}');
    expect(tooltip('Week of Sep 21')).toHaveTextContent(/Week of Sep 21\s*236\s*Votes\s*−0\.33\s*Mean gap/);

    // The window starts 12 weeks back, at Jul 13, not at the log's first week (Jun 29).
    await user.keyboard('{Home}');
    expect(tooltip('Week of Jul 13')).toHaveTextContent(/Week of Jul 13\s*88\s*Votes\s*−0\.44\s*Mean gap/);
  });

  it('shows the tooltip under the pointer and drops it when the pointer leaves', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.hover(chart());
    // jsdom lays nothing out (every rect is zeros), so which week the pointer
    // lands on is the kit's business (R1-3b tests the mapping). This checks the
    // card's wiring: a week's title, then its votes and its mean gap, in order.
    const title = screen.getByText(/^Week of [A-Z][a-z]{2} \d{1,2}$/).textContent ?? '';
    expect(tooltip(title)).toHaveTextContent(/\d\s*Votes\s*\S+\s*Mean gap$/);
    await user.unhover(chart());
    expect(screen.queryByText(/^Week of /)).not.toBeInTheDocument();
  });

  it('gives a quiet week an empty column with no gap, instead of skipping it', async () => {
    const user = userEvent.setup();
    renderCard({weekly: EARLY_ANALYTICS.global.weekly});
    act(() => chart().focus());
    await user.keyboard('{Home}{ArrowRight}');
    expect(tooltip('Week of Sep 14')).toHaveTextContent(/Week of Sep 14\s*0\s*Votes\s*—\s*Mean gap/);
  });

  it('prints each week’s gap under its date in the gap’s colour, and nothing under a quick-vote-only week', () => {
    const {container} = renderCard();
    const sep28 = subLabelUnder(container, 'Sep 28');
    expect(sep28).toHaveTextContent('−0.30');
    expect(sep28).toHaveAttribute('fill', ADMIN_COLORS.over);
    // The week of Aug 10 holds only quick votes, so it has no gap to print.
    expect(subLabelUnder(container, 'Aug 10')).toBeNull();
  });

  it('mutes a gap that prints "0.00", whichever side of zero it is on', () => {
    const weekly = ANALYTICS.global.weekly.map((w) => (w.week === '2026-09-28' ? {...w, meanGap: -0.004} : w));
    const {container} = renderCard({weekly});
    const sep28 = subLabelUnder(container, 'Sep 28');
    expect(sep28).toHaveTextContent('0.00');
    expect(sep28).toHaveAttribute('fill', ADMIN_COLORS.muted);
  });

  it('has a table view of every week in the window', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', {name: 'Table'}));
    const table = screen.getByRole('table', {name: 'Votes and mean gap per week'});
    const [head, ...rows] = within(table).getAllByRole('row');
    expect(cells(head)).toEqual(['Week', 'Votes', 'Mean gap']);
    expect(rows).toHaveLength(12);
    expect(cells(rows[0])).toEqual(['Jul 13', '88', '−0.44']);
    // The week of Aug 10 holds only quick votes, so it has no gap.
    expect(cells(rows[4])).toEqual(['Aug 10', '134', '—']);
    expect(cells(rows[11])).toEqual(['Sep 28', '260', '−0.30']);

    await user.click(screen.getByRole('button', {name: 'Chart'}));
    expect(chart()).toBeInTheDocument();
  });

  it('charts only the newest weeks that fit a narrow card, and keeps the whole window in the table', async () => {
    // A 460px plot holds 10 slots of 46px (weeksThatFit), so the chart starts two weeks
    // later, at Jul 27. The frame is the plot plus BarChart's y-axis gutter and its 8px right pad.
    measured.width = 460 + BAR_Y_AXIS_WIDTH + 8;
    const user = userEvent.setup();
    renderCard();
    act(() => chart().focus());
    await user.keyboard('{Home}');
    expect(tooltip('Week of Jul 27')).toHaveTextContent(/Week of Jul 27\s*96\s*Votes/);
    await user.keyboard('{End}');
    expect(tooltip('Week of Sep 28')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Table'}));
    const rows = within(screen.getByRole('table', {name: 'Votes and mean gap per week'})).getAllByRole('row');
    expect(rows).toHaveLength(13);
    expect(cells(rows[1])[0]).toBe('Jul 13');
  });

  it('says so when there are no votes yet, with nothing to chart', () => {
    renderCard({weekly: []});
    expect(screen.getByText('No votes yet.')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Table'})).not.toBeInTheDocument();
  });

  it('titles the card with the same h2 in every state', () => {
    // Panel titles the raw-votes notice and the empty state; ChartFrame titles the chart (R1-3b).
    const states: CardProps[] = [{}, {hasRawVotes: false}, {weekly: []}];
    for (const props of states) {
      const {unmount} = renderCard(props);
      expect(screen.getByRole('heading', {level: 2, name: 'Weekly activity'})).toBeInTheDocument();
      unmount();
    }
  });
});
