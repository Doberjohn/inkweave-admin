import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {COLORS} from '../../../app-bridge';
import {PairList} from '../PairList';
import type {PairStat} from '../voteAnalyticsTypes';

function pair(a: string, b: string): PairStat {
  return {a, b, aName: `Card ${a}`, bName: `Card ${b}`, engineScore: 7, communityScore: 4, gap: -3, scoreVotes: 1, rules: []};
}

const PAIRS = [pair('1', '2'), pair('3', '4')];

describe('PairList', () => {
  it('selects a pair and marks the selected one pressed', async () => {
    const onSelectPair = vi.fn();
    render(<PairList pairs={PAIRS} selectedPair={{a: '1', b: '2'}} onSelectPair={onSelectPair} />);

    await userEvent.click(screen.getByRole('button', {name: /Card 3/}));
    expect(onSelectPair).toHaveBeenCalledWith({a: '3', b: '4'});
    expect(screen.getByRole('button', {name: /Card 1/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: /Card 3/})).toHaveAttribute('aria-pressed', 'false');
  });

  it('colors each score jump by direction, as the verdict scale does', () => {
    const under = {...pair('5', '6'), engineScore: 4, communityScore: 6, gap: 2};
    const even = {...pair('7', '8'), engineScore: 5, communityScore: 5, gap: 0};
    render(<PairList pairs={[pair('1', '2'), under, even]} selectedPair={null} onSelectPair={vi.fn()} />);

    expect(screen.getByText('7 → 4')).toHaveStyle({color: COLORS.error});
    expect(screen.getByText('4 → 6')).toHaveStyle({color: COLORS.success});
    expect(screen.getByText('5 → 5')).toHaveStyle({color: COLORS.textMuted});
  });

  it('is the "Widest gaps" panel, captioned engine → community, with one list item per pair', () => {
    render(<PairList pairs={PAIRS} selectedPair={null} onSelectPair={vi.fn()} />);
    const panel = screen.getByRole('region', {name: 'Widest gaps'});

    expect(within(panel).getByText('engine → community')).toBeInTheDocument();
    expect(within(panel).getAllByRole('listitem')).toHaveLength(2);
    // The rows scroll inside the panel, so R2-6 puts no scroll wrapper around it.
    expect(within(panel).getByRole('list')).toHaveStyle({maxHeight: '384px', overflowY: 'auto'});
    expect(within(panel).getByText(/trust the rule-level trend over any one row/)).toBeInTheDocument();
  });

  it('names each row in words, as the scatter names its dot', () => {
    render(<PairList pairs={PAIRS} selectedPair={null} onSelectPair={vi.fn()} />);
    expect(
      screen.getByRole('button', {name: 'Card 1 × Card 2: engine 7, community 4, gap −3.00, 1 vote'}),
    ).toBeInTheDocument();
  });

  it('prints an average score to two places, as the scatter does', () => {
    const averaged = {...pair('5', '6'), engineScore: 8, communityScore: 7.5, gap: -0.5, scoreVotes: 2};
    render(<PairList pairs={[averaged]} selectedPair={null} onSelectPair={vi.fn()} />);

    expect(screen.getByText('8 → 7.50')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Card 5 × Card 6: engine 8, community 7.50, gap −0.50, 2 votes'}),
    ).toBeInTheDocument();
  });

  it('presses the selected pair given the other way round, as the scatter and the vote panel match it', () => {
    render(<PairList pairs={PAIRS} selectedPair={{a: '2', b: '1'}} onSelectPair={vi.fn()} />);
    expect(screen.getByRole('button', {name: /Card 1/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: /Card 3/})).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows emptyText in place of the list, and "No voted pairs yet." without it', () => {
    const {rerender} = render(
      <PairList pairs={[]} selectedPair={null} onSelectPair={vi.fn()} emptyText="No voted pairs for this rule yet." />,
    );
    const panel = screen.getByRole('region', {name: 'Widest gaps'});
    expect(within(panel).getByText('No voted pairs for this rule yet.')).toBeInTheDocument();
    expect(within(panel).queryByRole('list')).not.toBeInTheDocument();
    expect(within(panel).queryByText(/trust the rule-level trend/)).not.toBeInTheDocument();

    rerender(<PairList pairs={[]} selectedPair={null} onSelectPair={vi.fn()} />);
    expect(screen.getByText('No voted pairs yet.')).toBeInTheDocument();
  });
});
