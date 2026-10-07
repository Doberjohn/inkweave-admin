import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {SplitMeter, type SplitMeterPart} from '../SplitMeter';

const ANSWERS = [
  {id: 'tooHigh', label: 'Too high', color: ADMIN_COLORS.over},
  {id: 'right', label: 'Right', color: ADMIN_COLORS.barNeutral},
  {id: 'tooLow', label: 'Too low', color: ADMIN_COLORS.under},
] as const;

type Counts = Record<(typeof ANSWERS)[number]['id'], number>;

/** The three accuracy answers with these counts, too high to too low. */
function answers(counts: Counts): SplitMeterPart[] {
  return ANSWERS.map((part) => ({...part, value: counts[part.id]}));
}

/** Every test names its meter this. */
const NAME = 'Accuracy answers';

/** The legend's rows, as text. */
function legendRows() {
  return within(screen.getByRole('list', {name: NAME}))
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

describe('SplitMeter', () => {
  it('prints every part’s label, share and count in a list named by ariaLabel, zero parts included', () => {
    render(<SplitMeter parts={answers({tooHigh: 12, right: 30, tooLow: 0})} ariaLabel={NAME} />);
    expect(legendRows()).toEqual(['Too high 29% (12)', 'Right 71% (30)', 'Too low 0% (0)']);
  });

  it.each<[Counts, string[]]>([
    // R-43: a part with a count never reads 0%, and one short of the whole never reads 100%.
    [{tooHigh: 1, right: 399, tooLow: 0}, ['Too high <1% (1)', 'Right >99% (399)', 'Too low 0% (0)']],
    // Each part rounds on its own, so equal counts read alike (and these sum to 99%).
    [{tooHigh: 1, right: 1, tooLow: 1}, ['Too high 33% (1)', 'Right 33% (1)', 'Too low 33% (1)']],
    // A part with every count reads 100%, and counts are grouped.
    [{tooHigh: 0, right: 2054, tooLow: 0}, ['Too high 0% (0)', 'Right 100% (2,054)', 'Too low 0% (0)']],
  ])('prints %j as %j', (counts, rows) => {
    render(<SplitMeter parts={answers(counts)} ariaLabel={NAME} />);
    expect(legendRows()).toEqual(rows);
  });

  it('keeps text in text colours: the swatch carries the part’s colour', () => {
    render(<SplitMeter parts={answers({tooHigh: 12, right: 30, tooLow: 8})} ariaLabel={NAME} />);
    const list = screen.getByRole('list', {name: NAME});
    expect(list).toHaveStyle({color: ADMIN_COLORS.muted});
    const [first] = within(list).getAllByRole('listitem');
    expect(first.querySelector('[aria-hidden="true"]')).toHaveStyle({backgroundColor: ADMIN_COLORS.over});
    expect(within(first).getByText('24%')).toHaveStyle({color: ADMIN_COLORS.text, fontWeight: '600'});
  });

  it('draws one segment per part above zero, in order, grown by its count and painted its colour', () => {
    const {container} = render(
      <SplitMeter parts={answers({tooHigh: 12, right: 30, tooLow: 0})} ariaLabel={NAME} />,
    );
    const segments = Array.from(container.querySelectorAll<HTMLElement>('[data-part]'));
    expect(segments.map((segment) => segment.dataset.part)).toEqual(['tooHigh', 'right']);
    expect(segments[0]).toHaveStyle({flexGrow: '12', backgroundColor: ADMIN_COLORS.over});
    expect(segments[1]).toHaveStyle({flexGrow: '30', backgroundColor: ADMIN_COLORS.barNeutral});
  });

  it('hides the bar from assistive tech, with the surface gap between segments and rounded outer ends', () => {
    const {container} = render(
      <SplitMeter parts={answers({tooHigh: 12, right: 30, tooLow: 8})} ariaLabel={NAME} />,
    );
    const bar = container.querySelector('[data-part]')?.parentElement;
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(bar).toHaveStyle({columnGap: '2px', height: '10px', borderRadius: '4px', overflow: 'hidden'});
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  });

  it('keeps a part with a sliver of the whole visible, 4px wide or more', () => {
    const {container} = render(
      <SplitMeter parts={answers({tooHigh: 1, right: 399, tooLow: 0})} ariaLabel={NAME} />,
    );
    expect(container.querySelector('[data-part="tooHigh"]')).toHaveStyle({minWidth: '4px'});
  });

  it('shows the bare track and "No answers yet." when every part is zero', () => {
    const {container} = render(
      <SplitMeter parts={answers({tooHigh: 0, right: 0, tooLow: 0})} ariaLabel={NAME} />,
    );
    expect(screen.getByText('No answers yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-part]')).toHaveLength(0);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveStyle({backgroundColor: ADMIN_COLORS.barTrack});
  });

  it('takes the empty line from emptyText, and treats no parts as empty', () => {
    render(<SplitMeter parts={[]} ariaLabel="Partners by strength tier" emptyText="No synergy partners." />);
    expect(screen.getByText('No synergy partners.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
