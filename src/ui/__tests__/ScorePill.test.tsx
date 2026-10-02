import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {ScorePill} from '../ScorePill';

describe('ScorePill', () => {
  it.each([7, 10])('colours a high score (%s) in the under-rates colour', (score) => {
    render(<ScorePill score={score} />);
    expect(screen.getByText(String(score))).toHaveStyle({color: ADMIN_COLORS.under});
  });

  it.each([1, 4])('colours a low score (%s) in the over-rates colour', (score) => {
    render(<ScorePill score={score} />);
    expect(screen.getByText(String(score))).toHaveStyle({color: ADMIN_COLORS.over});
  });

  it.each([5, 6])('leaves a middling score (%s) neutral', (score) => {
    render(<ScorePill score={score} />);
    expect(screen.getByText(String(score))).toHaveStyle({color: ADMIN_COLORS.text});
  });

  it('shows an average to one place, in its band', () => {
    render(<ScorePill score={6.5} />);
    expect(screen.getByText('6.5')).toHaveStyle({color: ADMIN_COLORS.text});
  });

  it('bands an average by the value it shows', () => {
    render(<ScorePill score={6.96} />);
    expect(screen.getByText('7.0')).toHaveStyle({color: ADMIN_COLORS.under});
    render(<ScorePill score={4.04} />);
    expect(screen.getByText('4.0')).toHaveStyle({color: ADMIN_COLORS.over});
  });

  it('shows a named dash for a vote with no score, in no band', () => {
    render(<ScorePill score={null} />);
    const pill = screen.getByRole('img', {name: 'No score'});
    expect(pill).toHaveTextContent('—');
    expect(pill).toHaveStyle({color: ADMIN_COLORS.muted});
  });
});
