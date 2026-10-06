import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
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

  describe('scrolling the pressed row into view', () => {
    // A dot picked on the scatter can sit below the rows on show, or past the widest 40. Only the
    // list's own scroller may move: scrollIntoView would scroll the page too, taking the scatter
    // just picked from out of view. jsdom does no layout, so the boxes are stubbed: the list shows
    // 100 to 484 in the view.
    const box = (top: number, bottom: number) => ({top, bottom}) as DOMRect;
    const pick = {a: '4', b: '3'};
    // jsdom has no scrollIntoView. A spy stands in, so a call shows up rather than throwing.
    const original = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
    const scrollIntoView = vi.fn();

    beforeEach(() => {
      scrollIntoView.mockClear();
      Object.defineProperty(Element.prototype, 'scrollIntoView', {configurable: true, writable: true, value: scrollIntoView});
    });
    afterEach(() => {
      if (original) Object.defineProperty(Element.prototype, 'scrollIntoView', original);
      else delete (Element.prototype as Partial<Element>).scrollIntoView;
    });

    /** Renders with nothing picked, puts the list and the second row at the given boxes, and starts the list at `scrollTop`. */
    function renderUnpicked(rowBox: DOMRect, scrollTop = 0) {
      const view = render(<PairList pairs={PAIRS} selectedPair={null} onSelectPair={vi.fn()} />);
      const list = screen.getByRole('list');
      const row = screen.getByRole('button', {name: /^Card 3 × Card 4/});
      vi.spyOn(list, 'getBoundingClientRect').mockReturnValue(box(100, 484));
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(rowBox);
      list.scrollTop = scrollTop;
      const pickPair = (selectedPair: {a: string; b: string} | null) =>
        view.rerender(<PairList pairs={PAIRS} selectedPair={selectedPair} onSelectPair={vi.fn()} />);
      return {list, pickPair};
    }

    it('scrolls the list down by the overflow of a pressed row below it', () => {
      const {list, pickPair} = renderUnpicked(box(520, 556));
      pickPair(pick);
      expect(screen.getByRole('button', {pressed: true})).toHaveAccessibleName(/^Card 3 × Card 4/);
      expect(list.scrollTop).toBe(72);
    });

    it('scrolls the list up by the overflow of a pressed row above it', () => {
      const {list, pickPair} = renderUnpicked(box(60, 96), 200);
      pickPair(pick);
      expect(list.scrollTop).toBe(160);
    });

    it('leaves the list where it is for a pressed row already inside it', () => {
      const {list, pickPair} = renderUnpicked(box(200, 236), 50);
      pickPair(pick);
      expect(list.scrollTop).toBe(50);
    });

    it('scrolls only as a pair is picked: not with no pick, not for the same pick either way round, not on clear', () => {
      const {list, pickPair} = renderUnpicked(box(520, 556));
      expect(list.scrollTop).toBe(0);

      pickPair(pick);
      expect(list.scrollTop).toBe(72);
      // The row's box is stubbed, so a second scroll would add another 72.
      pickPair({a: '3', b: '4'});
      pickPair(null);
      expect(list.scrollTop).toBe(72);
    });

    it('never scrolls the page: scrollIntoView is not called', () => {
      const {pickPair} = renderUnpicked(box(520, 556));
      pickPair(pick);
      expect(scrollIntoView).not.toHaveBeenCalled();
    });
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
