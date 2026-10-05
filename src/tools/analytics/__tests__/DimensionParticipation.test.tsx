import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {DimensionParticipation} from '../DimensionParticipation';
import type {DimensionFill} from '../voteAnalyticsTypes';

const FILL: DimensionFill = {score: 1730, accuracy: 115, isReal: 24, wouldPlay: 24, difficulty: 24};
const ALL_VOTES = 'All votes, whatever the rule';

describe('DimensionParticipation', () => {
  it("lists each dimension's share of the votes, over the footnote", () => {
    render(<DimensionParticipation fill={FILL} totalVotes={1823} />);
    const panel = screen.getByRole('region', {name: 'Dimension participation'});

    expect(within(panel).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Synergy score94.9%',
      'Accuracy6.3%',
      'Is real1.3%',
      'Would play1.3%',
      'Difficulty1.3%',
    ]);
    expect(within(panel).getByText(/who_carries excluded/)).toBeInTheDocument();
  });

  it('shows the scope beside its title when given, and nothing there without it', () => {
    const {rerender} = render(<DimensionParticipation fill={FILL} totalVotes={1823} scope={ALL_VOTES} />);
    // Panel's header row holds the h2 and the action side by side.
    const header = () => screen.getByRole('heading', {level: 2, name: 'Dimension participation'}).parentElement;
    expect(header()).toHaveTextContent(ALL_VOTES);

    rerender(<DimensionParticipation fill={FILL} totalVotes={1823} />);
    expect(header()).toHaveTextContent(/^Dimension participation$/);
    expect(screen.queryByText(ALL_VOTES)).not.toBeInTheDocument();
  });

  it('says there is nothing to measure without votes', () => {
    render(<DimensionParticipation fill={null} totalVotes={0} />);
    expect(screen.getByText('No votes yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
