import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {KpiCard} from '../KpiCard';
import {RawTag} from '../RawTag';

describe('KpiCard', () => {
  it('groups the value and hint under the label, leaving the tag out of the name', () => {
    render(<KpiCard label="Distinct voters" value="114" hint="from raw vote log" tag={<RawTag />} />);
    const card = screen.getByRole('group', {name: 'Distinct voters'});
    expect(within(card).getByText('114')).toBeInTheDocument();
    expect(within(card).getByText('from raw vote log')).toBeInTheDocument();
    expect(within(card).getByText('raw')).toBeInTheDocument();
  });

  it('draws the value in the text colour unless given one', () => {
    const {rerender} = render(<KpiCard label="Total votes" value="2,054" />);
    expect(screen.getByText('2,054')).toHaveStyle({color: ADMIN_COLORS.text});

    rerender(<KpiCard label="Engine-silent pairs" value="196" valueColor={ADMIN_COLORS.accent} />);
    expect(screen.getByText('196')).toHaveStyle({color: ADMIN_COLORS.accent});
  });

  it('leaves the hint out when there is none', () => {
    render(<KpiCard label="Pairs covered" value="1,928" />);
    expect(screen.getByRole('group', {name: 'Pairs covered'})).toHaveTextContent(/^Pairs covered1,928$/);
  });
});
