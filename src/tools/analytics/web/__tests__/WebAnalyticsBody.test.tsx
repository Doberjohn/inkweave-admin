import {describe, expect, it, vi} from 'vitest';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import {WebAnalyticsBody} from '../WebAnalyticsBody';
import type {BreakdownRow, VercelAnalytics, VercelEvent} from '../../vercelAnalyticsTypes';

// jsdom has no ResizeObserver, so the bridged useContainerWidth stays at 0.
// R1-3b's LineChart measures itself with it, so this gives it a card's width.
vi.mock('../../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useContainerWidth: () => 720,
}));

function event(name: string, label: string, total: number, overrides: Partial<VercelEvent> = {}): VercelEvent {
  return {name, label, total, visitors: 1, trend: [], breakdowns: [], ...overrides};
}

function row(value: string, count: number): BreakdownRow {
  return {value, count, visitors: 1};
}

const REVEALS = event('reveal_card_click', 'Reveal card clicks', 9340, {
  visitors: 1310,
  trend: [
    {date: '2026-09-26', count: 4},
    {date: '2026-09-27', count: 10},
    {date: '2026-09-28', count: 1},
    {date: '2026-09-29', count: 10},
    {date: '2026-09-30', count: 5},
  ],
  breakdowns: [
    {prop: 'ink', label: 'By ink', rows: [row('Amber', 30), row('Others', 50), row('Steel', 20)]},
    {
      prop: 'rarity',
      label: 'By rarity',
      rows: [row('Others', 50), row('Common', 30), row('Enchanted', 10), row('Super Rare', 20)],
    },
    // A blank value, as the real export has: the events that sent no franchise.
    {prop: 'franchise', label: 'By franchise', rows: [row('Frozen', 12), row('', 6), row('Moana', 4)]},
    {prop: 'deviceType', label: 'By device', rows: []},
  ],
});
const SEARCHES = event('search_submitted', 'Searches', 5120);
const SKIPS = event('vote_skipped', 'Votes skipped', 230, {trend: [{date: '2026-09-30', count: 3}]});

const ANALYTICS: VercelAnalytics = {
  generatedAt: '2026-09-30T04:00:00Z',
  hasVercelData: true,
  reportingWindow: {since: '2026-09-12', until: '2026-09-30'},
  events: [SEARCHES, REVEALS, SKIPS],
};

/** The value printed under a trend stat's label. */
function stat(label: string) {
  return screen.getByText(label).nextElementSibling;
}

/** The trend card: the chart frame's figure around its title. */
function trendCard(title: string) {
  return screen.getByRole('heading', {name: title}).closest('figure')!;
}

/** The chart's plot: the crosshair's slider, named after the chart. */
function plot(name: string) {
  return screen.getByRole('slider', {name});
}

/** The tooltip showing `title`. ChartTooltip's root is aria-hidden (R1-3b), so it is found by its text. */
function tooltip(title: string): HTMLElement {
  const tip = screen.getByText(title).closest<HTMLElement>('[aria-hidden="true"]');
  expect(tip, `no tooltip around "${title}"`).not.toBeNull();
  return tip as HTMLElement;
}

/** The body rows of the table named `caption`, as the text of each cell, header cells included. */
function tableRows(caption: string) {
  const [, ...body] = within(screen.getByRole('table', {name: caption})).getAllByRole('row');
  return body.map((tr) => [...tr.querySelectorAll('th, td')].map((cell) => cell.textContent));
}

/** A day label as fmtDay prints it ("Sep 30"). */
const DAY_LABEL = /^[A-Z][a-z]{2} \d{1,2}$/;

/** The rows of the breakdown list that holds `value`, by their tooltip. */
function rowsAround(value: string) {
  return within(screen.getByText(value).closest('ul')!)
    .getAllByRole('listitem')
    .map((li) => li.title);
}

async function pick(label: RegExp) {
  await userEvent.click(screen.getByRole('button', {name: label}));
}

describe('WebAnalyticsBody', () => {
  it('focuses the busiest event first, then the one you pick', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    expect(screen.getByRole('button', {name: /Reveal card clicks/})).toHaveAttribute('aria-pressed', 'true');
    // Text never wears the series colour, so the pressed card's total stays in the text colour.
    expect(screen.getByText('9,340')).toHaveStyle({color: ADMIN_COLORS.text});

    await pick(/Searches/);
    expect(screen.getByRole('button', {name: /Searches/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: /Reveal card clicks/})).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('9,340')).toHaveStyle({color: ADMIN_COLORS.text});
    expect(screen.getByRole('heading', {name: 'Searches per day'})).toBeInTheDocument();
  });

  it('sums every event all-time and names the trend window', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    expect(screen.getByText('events tracked across 3 event types · all-time')).toHaveTextContent(
      '14,690 events tracked across 3 event types · all-time',
    );
    expect(screen.getByText('Trends & breakdowns')).toHaveTextContent('Trends & breakdowns Sep 12 – Sep 30');
  });

  it('leaves out the window pill when the artifact has no window', () => {
    render(<WebAnalyticsBody analytics={{...ANALYTICS, reportingWindow: null}} />);
    expect(screen.queryByText('Trends & breakdowns')).not.toBeInTheDocument();
  });

  it('shows the reporting window instead of a range control (R-9)', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    // One window covers the trends and the breakdowns alike, so a range could only move the trend.
    expect(screen.queryByRole('group', {name: 'Range'})).not.toBeInTheDocument();
    expect(screen.getByText('Trends & breakdowns')).toBeInTheDocument();
  });

  it("summarises the selected event's trend over the whole window, giving a tied peak to the later day", () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    expect(screen.getByRole('heading', {name: 'Reveal card clicks per day'})).toBeInTheDocument();
    expect(screen.getByText('1,310 visitors all-time')).toBeInTheDocument();
    expect(stat('In window')).toHaveTextContent('30');
    // 30 over the window's 19 days (Sep 12 to Sep 30), not over the 5 days the trend returned.
    expect(stat('Daily average')).toHaveTextContent('1.6');
    expect(stat('Peak day')).toHaveTextContent('Sep 29');
  });

  it('charts the selected event across the window, with dates from the filled trend', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    const chart = plot('Reveal card clicks per day, Sep 12 to Sep 30');
    expect(Number(chart.getAttribute('aria-valuemax')) - Number(chart.getAttribute('aria-valuemin')) + 1).toBe(19);
    expect(chart).toHaveAttribute('aria-valuenow');
    // The kit's default ticks over the 19 filled days put the quarter points on Sep 17, Sep 21 and Sep 26.
    const card = trendCard('Reveal card clicks per day');
    for (const label of ['Sep 12', 'Sep 17', 'Sep 21', 'Sep 26', 'Sep 30']) {
      expect(within(card).getByText(label)).toBeInTheDocument();
    }
  });

  it('moves the crosshair with the arrow keys, reading each day and its count', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    const chart = plot('Reveal card clicks per day, Sep 12 to Sep 30');
    // Sep 28 is neither an axis label nor a stat, so its text shows only in the tooltip.
    expect(screen.queryByText('Sep 28')).not.toBeInTheDocument();

    act(() => chart.focus());
    await userEvent.keyboard('{End}');
    // Screen readers get the tooltip's text as the slider's value: the day, then the count.
    expect(chart).toHaveAttribute('aria-valuetext', expect.stringMatching(/Sep 30.*\b5\b/));

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    // The tooltip's title is the day; its one row leads with the count, then the event.
    expect(tooltip('Sep 28')).toHaveTextContent(/Sep 28\s*1\s*Reveal card clicks/);
    expect(chart).toHaveAttribute('aria-valuetext', expect.stringMatching(/Sep 28.*\b1\b/));

    // Sep 12 is a day Vercel left out: the cursor reads it as 0.
    await userEvent.keyboard('{Home}');
    expect(chart).toHaveAttribute('aria-valuetext', expect.stringMatching(/Sep 12.*\b0\b/));
    expect(screen.queryByText('Sep 28')).not.toBeInTheDocument();
  });

  it('shows the tooltip under the pointer and drops it when the pointer leaves', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    const card = trendCard('Reveal card clicks per day');
    const chart = plot('Reveal card clicks per day, Sep 12 to Sep 30');
    // The day labels before any hover: the five axis labels and the peak day.
    const labelsOnly = within(card).getAllByText(DAY_LABEL).length;

    await userEvent.hover(chart);
    // jsdom lays nothing out, so which day the pointer lands on is the kit's
    // business (R1-3b tests the mapping). This checks the card's wiring: a
    // tooltip titled with a day, and a day in the slider's value.
    expect(within(card).getAllByText(DAY_LABEL).length).toBeGreaterThan(labelsOnly);
    expect(chart).toHaveAttribute('aria-valuetext', expect.stringMatching(/^[A-Z][a-z]{2} \d{1,2}\b/));

    await userEvent.unhover(chart);
    expect(within(card).getAllByText(DAY_LABEL)).toHaveLength(labelsOnly);
  });

  it('starts the crosshair afresh when you pick another event', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    const labelsOnly = within(trendCard('Reveal card clicks per day')).getAllByText(DAY_LABEL).length;
    // A pointer move with no leave holds the cursor. Blur would clear it anyway (R1-3b),
    // so the pick is a bare click: no pointer or focus events reach the plot.
    fireEvent.pointerMove(plot('Reveal card clicks per day, Sep 12 to Sep 30'), {clientX: 0});
    expect(within(trendCard('Reveal card clicks per day')).getAllByText(DAY_LABEL)).toHaveLength(labelsOnly + 1);
    fireEvent.click(screen.getByRole('button', {name: /Votes skipped/}));
    expect(plot('Votes skipped per day, Sep 12 to Sep 30')).toBeInTheDocument();
    // The same five axis labels and a peak day: without TrendCard's key, the held cursor would add a tooltip title.
    expect(within(trendCard('Votes skipped per day')).getAllByText(DAY_LABEL)).toHaveLength(labelsOnly);
  });

  it('lists every day of the window in the table view, idle days as 0, and switches back', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    expect(screen.getByRole('button', {name: 'Table'})).toHaveAttribute('aria-pressed', 'true');
    const rows = tableRows('Reveal card clicks per day, Sep 12 to Sep 30');
    expect(rows).toHaveLength(19);
    expect(rows[0]).toEqual(['Sep 12', '0']);
    expect(rows.slice(-5)).toEqual([
      ['Sep 26', '4'],
      ['Sep 27', '10'],
      ['Sep 28', '1'],
      ['Sep 29', '10'],
      ['Sep 30', '5'],
    ]);
    // The stats sit in the frame's header, so they stay with the table.
    expect(stat('In window')).toHaveTextContent('30');
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'Chart'}));
    expect(plot('Reveal card clicks per day, Sep 12 to Sep 30')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('keeps the table view when you pick another event', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    await pick(/Searches/);
    const rows = tableRows('Searches per day, Sep 12 to Sep 30');
    expect(rows).toHaveLength(19);
    expect(rows.every(([, count]) => count === '0')).toBe(true);
  });

  it('counts the days Vercel left out as zero, across the whole window', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    await pick(/Votes skipped/);
    // One day of data (Sep 30) in a 19-day window: the chart spans the window, and the average is 3 / 19.
    expect(plot('Votes skipped per day, Sep 12 to Sep 30')).toBeInTheDocument();
    expect(within(trendCard('Votes skipped per day')).getByText('Sep 12')).toBeInTheDocument();
    expect(stat('In window')).toHaveTextContent('3');
    expect(stat('Daily average')).toHaveTextContent('0.2');
    expect(stat('Peak day')).toHaveTextContent('Sep 30');
  });

  it('says so when the selected event has no days in the window', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    await pick(/Searches/);
    expect(screen.getByText('No activity in window.')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(stat('In window')).toHaveTextContent('0');
    expect(stat('Daily average')).toHaveTextContent('—');
    expect(stat('Peak day')).toHaveTextContent('—');
  });

  it('treats a window of zero-count days as no activity', async () => {
    const idle = event('sort_changed', 'Sort changes', 1, {
      trend: [
        {date: '2026-09-29', count: 0},
        {date: '2026-09-30', count: 0},
      ],
    });
    render(<WebAnalyticsBody analytics={{...ANALYTICS, events: [...ANALYTICS.events, idle]}} />);
    await pick(/Sort changes/);
    expect(screen.getByText('No activity in window.')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(stat('Daily average')).toHaveTextContent('—');
    expect(stat('Peak day')).toHaveTextContent('—');
  });

  it('has nothing to chart or list for an event with no days and no window', async () => {
    render(<WebAnalyticsBody analytics={{...ANALYTICS, reportingWindow: null}} />);
    await pick(/Searches/);
    expect(screen.getByText('No activity in window.')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(stat('In window')).toHaveTextContent('0');
    expect(stat('Peak day')).toHaveTextContent('—');
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    expect(tableRows('Searches per day')).toEqual([]);
  });

  it('draws a one-day trend as its one day, by keyboard and in the table', async () => {
    // With no window to fill to, the trend stays its one day, and the names say that day alone.
    render(<WebAnalyticsBody analytics={{...ANALYTICS, reportingWindow: null}} />);
    await pick(/Votes skipped/);
    const chart = plot('Votes skipped per day, Sep 30');
    act(() => chart.focus());
    await userEvent.keyboard('{Home}');
    expect(chart).toHaveAttribute('aria-valuetext', expect.stringMatching(/Sep 30.*\b3\b/));
    expect(stat('Daily average')).toHaveTextContent('3.0');
    expect(stat('Peak day')).toHaveTextContent('Sep 30');

    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    expect(tableRows('Votes skipped per day, Sep 30')).toEqual([['Sep 30', '3']]);
  });

  it('keeps each event card one control: its sparkline is a picture, not a chart', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    const card = screen.getByRole('button', {name: /Reveal card clicks/});
    expect(card.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    // Nothing inside the button takes focus or a role: no slider, link or second button.
    expect(card.querySelector('[role], [tabindex], a, button, input')).toBeNull();
  });

  it('puts the ink icon on ink rows and keeps "Others" last, as text', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    expect(rowsAround('Amber')).toEqual(['Amber: 30 (30%)', 'Steel: 20 (20%)', 'Others: 50 (50%)']);
    expect(screen.getByText('Amber').closest('li')!.querySelector('img')).not.toBeNull();
    expect(screen.getByText('Steel').closest('li')!.querySelector('img')).not.toBeNull();
    const inkList = screen.getByText('Amber').closest('ul')!;
    expect(within(inkList).getByText('Others').closest('li')!.querySelector('img')).toBeNull();
  });

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

  it('names a row with a blank value "(not set)", in its text and its title, with no icon', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    expect(rowsAround('Frozen')).toEqual(['Frozen: 12 (55%)', '(not set): 6 (27%)', 'Moana: 4 (18%)']);
    const notSet = screen.getByText('(not set)').closest('li')!;
    expect(notSet).toHaveTextContent(/^\(not set\)627%$/);
    expect(notSet.querySelector('img, svg')).toBeNull();
  });

  it('names each breakdown by its prop and says when one is empty', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    expect(screen.getByText('By device')).toBeInTheDocument();
    expect(screen.getByText('deviceType')).toBeInTheDocument();
    expect(screen.getByText('No data in window.')).toBeInTheDocument();
  });

  it('says when the selected event has no breakdowns configured', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    await pick(/Searches/);
    expect(screen.getByText('No property breakdowns configured for this event.')).toBeInTheDocument();
    expect(screen.queryByText('By ink')).not.toBeInTheDocument();
  });

  it('says why when the data could not be loaded, instead of loading forever', () => {
    render(<WebAnalyticsBody analytics={null} error={new Error('vercel-analytics.json has not been generated yet')} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load Web Analytics (vercel-analytics.json has not been generated yet).',
    );
    expect(screen.queryByText('Loading Web Analytics...')).not.toBeInTheDocument();
  });

  it('shows the loading state until the artifact arrives', () => {
    render(<WebAnalyticsBody analytics={null} />);
    expect(screen.getByText('Loading Web Analytics...')).toBeInTheDocument();
  });

  it('names the secrets to set when the artifact has no Vercel data', () => {
    render(<WebAnalyticsBody analytics={{...ANALYTICS, hasVercelData: false, reportingWindow: null, events: []}} />);
    expect(screen.getByText('VERCEL_ANALYTICS_TOKEN')).toBeInTheDocument();
    expect(screen.getByText('ANALYTICS_VERCEL_PROJECT_ID')).toBeInTheDocument();
    expect(screen.queryByText('No events tracked yet.')).not.toBeInTheDocument();
  });

  it('says when Vercel has no events yet', () => {
    render(<WebAnalyticsBody analytics={{...ANALYTICS, events: []}} />);
    expect(screen.getByText('No events tracked yet.')).toBeInTheDocument();
  });
});
