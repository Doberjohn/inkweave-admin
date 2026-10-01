import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {SegmentedControl} from '../SegmentedControl';

type SortKey = 'gap' | 'votes';
const OPTIONS: ReadonlyArray<{value: SortKey; label: string}> = [
  {value: 'gap', label: '|Gap|'},
  {value: 'votes', label: 'Votes'},
];

/** Holds the value the way a page does, so aria-pressed follows each change. */
function Harness({onChange}: {onChange: (v: SortKey) => void}) {
  const [value, setValue] = useState<SortKey>('gap');
  return (
    <SegmentedControl
      ariaLabel="Sort rules"
      options={OPTIONS}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe('SegmentedControl', () => {
  it('is a named group of toggle buttons with the selected one pressed', () => {
    render(<Harness onChange={() => {}} />);
    expect(screen.getByRole('group', {name: 'Sort rules'})).toBeInTheDocument();
    const gap = screen.getByRole('button', {name: '|Gap|'});
    expect(gap).toHaveAttribute('aria-pressed', 'true');
    expect(gap).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', {name: 'Votes'})).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports a click on another option', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', {name: 'Votes'}));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('votes');
    expect(screen.getByRole('button', {name: 'Votes'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: '|Gap|'})).toHaveAttribute('aria-pressed', 'false');
  });

  it('works from the keyboard: Tab between options, Enter or Space to pick', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', {name: 'Votes'})).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('votes');

    await userEvent.tab({shift: true});
    expect(screen.getByRole('button', {name: '|Gap|'})).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith('gap');
    expect(screen.getByRole('button', {name: '|Gap|'})).toHaveAttribute('aria-pressed', 'true');
  });

  it('ignores a press on the option that is already selected', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', {name: '|Gap|'}));
    expect(onChange).not.toHaveBeenCalled();
  });
});
