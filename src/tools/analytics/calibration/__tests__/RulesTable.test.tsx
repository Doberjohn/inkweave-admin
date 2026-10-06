import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {AdminStyles} from '../../../../theme/AdminStyles';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import type {RuleStat} from '../../voteAnalyticsTypes';
import type {CalibrationRow} from '../calibrationModel';
import {RulesTable} from '../RulesTable';

function stat(ruleId: string, meanGap: number | null, scoreVotes: number): RuleStat {
  return {
    ruleId,
    ruleName: ruleId,
    category: 'playstyle',
    scoreVotes,
    pairsVoted: 1,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 1,
  };
}

/** A row as buildCalibrationRows makes it: a playstyle under its own tuning key, unless `extra` says otherwise. */
function row(id: string, name: string, extra: Partial<CalibrationRow> = {}): CalibrationRow {
  return {id, name, category: 'playstyle', stat: null, tuningKey: id, ...extra};
}

const ROWS: CalibrationRow[] = [
  row('ramp', 'Ramp', {stat: stat('ramp', -0.57, 557)}),
  // A tuning.json entry no analytics rule reaches: listed last whatever the sort.
  row('questing', 'Questing'),
  row('shift-targets', 'Shift Targets', {category: 'direct', stat: stat('shift-targets', 1.2, 214)}),
  // A direct rule with no tuning.json copy.
  row('singer-songs', 'Singer + Songs', {category: 'direct', stat: stat('singer-songs', 0.18, 143), tuningKey: null}),
  // Two rules that share one tuning.json entry; one under LOW_N score votes, one exactly at it.
  row('location-boost', 'Location Boost', {stat: stat('location-boost', 2.44, 9), tuningKey: 'location-control'}),
  row('location-lore', 'Location Lore', {stat: stat('location-lore', -0.1, 10), tuningKey: 'location-control'}),
  row('dwarfs', 'Seven Dwarfs', {stat: stat('dwarfs', null, 0)}),
];

const NO_EDITS: ReadonlySet<string> = new Set();
const [TYPE, GAP, VOTES] = [1, 3, 4];

/** The table under AdminStyles, as AdminShell mounts it: the pressed row's first-cell bar is a stylesheet rule. */
function renderTable(props: Partial<React.ComponentProps<typeof RulesTable>> = {}) {
  const onSelect = vi.fn();
  render(
    <>
      <AdminStyles />
      <RulesTable rows={ROWS} selectedId={null} edited={NO_EDITS} onSelect={onSelect} {...props} />
    </>,
  );
  return onSelect;
}

/** The rule rows, top to bottom: each row is one button, inside the table. */
const ruleRows = () => within(screen.getByRole('table')).getAllByRole('button') as HTMLTableRowElement[];
/** One column's text, top to bottom. */
const column = (index: number) => ruleRows().map((r) => r.cells[index].textContent);
const ruleRow = (name: RegExp) => within(screen.getByRole('table')).getByRole('button', {name}) as HTMLTableRowElement;

describe('RulesTable', () => {
  it('sorts by the size of the gap, then by votes from the sort control', async () => {
    renderTable();
    expect(column(GAP)).toEqual(['+2.44', '+1.20', '−0.57', '+0.18', '−0.10', '—', '—']);
    expect(screen.getByRole('columnheader', {name: 'Gap'})).toHaveAttribute('aria-sort', 'other');
    expect(screen.getByRole('table', {name: 'Rules, widest gap first'})).toBeInTheDocument();

    const sort = screen.getByRole('group', {name: 'Sort rules by'});
    await userEvent.click(within(sort).getByRole('button', {name: 'Votes'}));
    expect(column(VOTES)).toEqual(['557', '214', '143', '10', '9', '0', '—']);
    expect(within(sort).getByRole('button', {name: 'Votes'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('columnheader', {name: 'Votes'})).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('columnheader', {name: 'Gap'})).not.toHaveAttribute('aria-sort');
    expect(screen.getByRole('table', {name: 'Rules, most votes first'})).toBeInTheDocument();
  });

  it('drops the sort control, the order and aria-sort when no row has a stat (tuning.json alone)', () => {
    renderTable({rows: [row('ramp', 'Ramp'), row('questing', 'Questing')]});
    expect(screen.queryByRole('group', {name: 'Sort rules by'})).not.toBeInTheDocument();
    expect(screen.getByRole('table', {name: 'Rules'})).toBeInTheDocument();
    expect(screen.getByRole('columnheader', {name: 'Gap'})).not.toHaveAttribute('aria-sort');
    expect(screen.getByRole('columnheader', {name: 'Votes'})).not.toHaveAttribute('aria-sort');
  });

  it('selects a row by click, Enter and Space, and marks the row whose id is selectedId pressed', async () => {
    const onSelect = renderTable({selectedId: 'location-boost'});
    const boost = ruleRow(/^Location Boost/);
    expect(within(screen.getByRole('table')).getAllByRole('button', {pressed: true})).toEqual([boost]);
    // AdminStyles draws the gold bar on the pressed row's first cell as well as on the row.
    expect(boost.cells[0]).toHaveStyle({boxShadow: `inset 2px 0 0 ${ADMIN_COLORS.accent}`});

    const ramp = ruleRow(/^Ramp/);
    expect(ramp).toHaveAttribute('aria-pressed', 'false');
    expect(ramp.cells[0]).not.toHaveStyle({boxShadow: `inset 2px 0 0 ${ADMIN_COLORS.accent}`});
    await userEvent.click(ramp);
    expect(ramp).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onSelect.mock.calls).toEqual([['ramp'], ['ramp'], ['ramp']]);
    // Space selects without scrolling the page.
    expect(fireEvent.keyDown(ramp, {key: ' '})).toBe(false);
    // A held key repeats; only its first press selects.
    fireEvent.keyDown(ramp, {key: 'Enter', repeat: true});
    expect(onSelect).toHaveBeenCalledTimes(4);
  });

  it('marks a rule with fewer than 10 score votes "low n", none included', () => {
    renderTable();
    expect(within(ruleRow(/^Location Boost/)).getByText('low n')).toBeInTheDocument();
    expect(within(ruleRow(/^Seven Dwarfs/)).getByText('low n')).toBeInTheDocument();
    expect(within(ruleRow(/^Location Lore/)).queryByText('low n')).not.toBeInTheDocument();
    expect(within(ruleRow(/^Questing/)).queryByText('low n')).not.toBeInTheDocument();
  });

  it('draws a rule with no score votes in muted text, at full opacity', () => {
    renderTable();
    expect(screen.getByText('Seven Dwarfs')).toHaveStyle({color: ADMIN_COLORS.muted});
    expect(screen.getByText('Ramp')).toHaveStyle({color: ADMIN_COLORS.text});
    expect(ruleRow(/^Seven Dwarfs/)).not.toHaveStyle({opacity: '0.5'});
  });

  it('shows "—" for Gap and Votes on a tuning-only row, with an empty bias bar, and lists it last', () => {
    renderTable();
    const last = ruleRows().at(-1)!;
    expect(last).toBe(ruleRow(/^Questing/));
    expect(last.cells[GAP]).toHaveTextContent('—');
    expect(last.cells[VOTES]).toHaveTextContent('—');
    expect(last.querySelector('[data-direction]')).toBeNull();
  });

  it('colours a gap by its side, and one that prints 0.00 as no gap', () => {
    const rows = [
      row('a', 'Alpha', {stat: stat('a', -0.57, 20)}),
      row('b', 'Beta', {stat: stat('b', 1.2, 20)}),
      row('c', 'Gamma', {stat: stat('c', -0.004, 20)}),
    ];
    renderTable({rows});
    expect(screen.getByText('−0.57')).toHaveStyle({color: ADMIN_COLORS.over});
    expect(screen.getByText('+1.20')).toHaveStyle({color: ADMIN_COLORS.under});
    expect(screen.getByText('0.00')).toHaveStyle({color: ADMIN_COLORS.muted});
  });

  it('shows the pending-edit dot on every row that shares an edited tuning key', () => {
    renderTable({edited: new Set(['location-control'])});
    expect(screen.getAllByRole('img', {name: 'Pending tuning edit'})).toHaveLength(2);
    expect(within(ruleRow(/^Location Lore/)).getByRole('img', {name: 'Pending tuning edit'})).toBeInTheDocument();
  });

  it('names each row with a word for every number, since a button row hides the column heads', () => {
    renderTable({edited: new Set(['location-control'])});
    expect(ruleRow(/^Location Boost/)).toHaveAccessibleName(
      'Location Boost, Playstyle, gap +2.44, 9 score votes, low n, pending tuning edit',
    );
    expect(ruleRow(/^Shift Targets/)).toHaveAccessibleName('Shift Targets, Direct, gap +1.20, 214 score votes');
    // Nobody has scored these, so no "gap —". A rule at 0 votes wears the "low n" tag, so its name says it too;
    // a tuning-only row has no tag.
    expect(ruleRow(/^Seven Dwarfs/)).toHaveAccessibleName('Seven Dwarfs, Playstyle, no score votes, low n');
    expect(ruleRow(/^Questing/)).toHaveAccessibleName('Questing, Playstyle, no score votes');
  });

  it("names each row's type as Playstyle or Direct", () => {
    renderTable();
    expect(column(TYPE)).toEqual(['Playstyle', 'Direct', 'Playstyle', 'Direct', 'Playstyle', 'Playstyle', 'Playstyle']);
  });

  it('shows the empty text in place of the table and the sort control when there are no rows', () => {
    const {rerender} = render(<RulesTable rows={[]} selectedId={null} edited={NO_EDITS} onSelect={() => {}} />);
    expect(screen.getByText('No rules to show.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', {name: 'Sort rules by'})).not.toBeInTheDocument();

    rerender(
      <RulesTable rows={[]} selectedId={null} edited={NO_EDITS} onSelect={() => {}} emptyText="Nothing here." />,
    );
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });
});
