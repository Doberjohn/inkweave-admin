import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {SynergyPanel} from '../components/SynergyPanel';
import {SYNERGY_GROUPS} from '../studioFixtures';

describe('SynergyPanel', () => {
  it('is a region named Synergies, marked computed live (R-90)', () => {
    render(<SynergyPanel groups={SYNERGY_GROUPS} />);
    const panel = screen.getByRole('region', {name: 'Synergies'});
    expect(within(panel).getByRole('heading', {level: 2, name: 'Synergies'})).toBeInTheDocument();
    expect(within(panel).getByText('computed live')).toBeInTheDocument();
  });

  it('lists each group with how many cards it pairs with, in admin colours', () => {
    render(<SynergyPanel groups={SYNERGY_GROUPS} />);
    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual(['Singer + Songs3 cards', 'Ramp1 card']);
    // R-90: the rows leave the app's legacy surfaceAlt and gray600 for admin's tokens; the count is muted, never dim (R-6).
    expect(rows[0]).toHaveStyle({color: ADMIN_COLORS.text});
    expect(within(rows[0]).getByText('3 cards')).toHaveStyle({color: ADMIN_COLORS.muted});
  });

  it('says none are found yet when the engine finds none', () => {
    render(<SynergyPanel groups={[]} />);
    const panel = screen.getByRole('region', {name: 'Synergies'});
    expect(within(panel).getByText('No synergies detected yet. Add card text or keywords to see matches.')).toHaveStyle({
      color: ADMIN_COLORS.muted,
    });
    expect(within(panel).queryByRole('list')).not.toBeInTheDocument();
  });
});
