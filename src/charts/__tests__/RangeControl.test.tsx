import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RangeControl as RangeControlFromRange, type RangePreset} from '../range';
import {RangeControl} from '../RangeControl';

function Harness({onChange}: {onChange: (v: RangePreset) => void}) {
  const [range, setRange] = useState<RangePreset>('30d');
  return (
    <RangeControl
      value={range}
      onChange={(v) => {
        setRange(v);
        onChange(v);
      }}
    />
  );
}

describe('RangeControl', () => {
  it('is a group named "Range" with the four presets, the current one pressed', () => {
    // charts/range serves it too, as the contract places it (R1-9 imports it there).
    expect(RangeControlFromRange).toBe(RangeControl);
    render(<Harness onChange={() => {}} />);
    const group = screen.getByRole('group', {name: 'Range'});
    expect(Array.from(group.querySelectorAll('button')).map((b) => b.textContent)).toEqual([
      '7 days',
      '30 days',
      '90 days',
      'All',
    ]);
    expect(screen.getByRole('button', {name: '30 days'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: '7 days'})).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports a new preset, and ignores the current one', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', {name: '30 days'}));
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', {name: '90 days'}));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('90d');
    expect(screen.getByRole('button', {name: '90 days'})).toHaveAttribute('aria-pressed', 'true');
  });
});
