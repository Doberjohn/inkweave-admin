import {describe, expect, it, vi} from 'vitest';
import {act, fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useChartCursor} from '../useChartCursor';

const DAYS = ['Sep 27', 'Sep 28', 'Sep 29', 'Sep 30'];
/** Each position's x, in px from the plot's left edge. */
const XS = [10, 30, 50, 70];

function Harness({days = DAYS}: {days?: string[]}) {
  const cursor = useChartCursor(days.length);
  return (
    <>
      <div aria-label="Votes per day" {...cursor.plotProps((i) => `${days[i]}: ${i + 1} votes`, XS)} />
      <output>{cursor.index == null ? 'none' : days[cursor.index]}</output>
    </>
  );
}

/** jsdom has no layout: put the plot 100px from the viewport's left edge. */
function placePlot(plot: HTMLElement) {
  vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 80, 40));
}

describe('useChartCursor', () => {
  it('makes the plot one named slider, resting on the newest position', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider', {name: 'Votes per day'});
    expect(slider).toHaveAttribute('tabindex', '0');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '3');
    expect(slider).toHaveAttribute('aria-valuenow', '3');
    expect(slider).toHaveAttribute('aria-valuetext', 'Sep 30: 4 votes');
    expect(screen.getByRole('status')).toHaveTextContent('none');
  });

  it('shows the newest position on focus and walks it with the keyboard', async () => {
    render(<Harness />);
    await userEvent.tab();
    const slider = screen.getByRole('slider');
    expect(slider).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Sep 30');

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('status')).toHaveTextContent('Sep 28');
    expect(slider).toHaveAttribute('aria-valuetext', 'Sep 28: 2 votes');

    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('status')).toHaveTextContent('Sep 27');
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('status')).toHaveTextContent('Sep 27');

    await userEvent.keyboard('{End}{ArrowRight}');
    expect(screen.getByRole('status')).toHaveTextContent('Sep 30');
    await userEvent.keyboard('{ArrowDown}{ArrowUp}{ArrowDown}');
    expect(screen.getByRole('status')).toHaveTextContent('Sep 29');
  });

  it('hides the tooltip on Escape without moving focus, and on blur', async () => {
    render(<Harness />);
    await userEvent.tab();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('status')).toHaveTextContent('none');
    expect(screen.getByRole('slider')).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('status')).toHaveTextContent('Sep 29');
    await userEvent.tab();
    expect(screen.getByRole('status')).toHaveTextContent('none');
  });

  it('keeps its place through Escape, so the value does not jump and the next step goes on from it', async () => {
    render(<Harness />);
    await userEvent.tab();
    await userEvent.keyboard('{Home}{ArrowRight}{Escape}');
    const slider = screen.getByRole('slider');
    expect(screen.getByRole('status')).toHaveTextContent('none');
    expect(slider).toHaveAttribute('aria-valuenow', '1');
    expect(slider).toHaveAttribute('aria-valuetext', 'Sep 28: 2 votes');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('status')).toHaveTextContent('Sep 29');
  });

  it('snaps the pointer to the nearest position and lets go when it leaves', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider');
    placePlot(slider);

    fireEvent.pointerMove(slider, {clientX: 100 + 38});
    expect(screen.getByRole('status')).toHaveTextContent('Sep 28');
    fireEvent.pointerMove(slider, {clientX: 100 + 61});
    expect(screen.getByRole('status')).toHaveTextContent('Sep 30');
    fireEvent.pointerMove(slider, {clientX: 0});
    expect(screen.getByRole('status')).toHaveTextContent('Sep 27');
    fireEvent.pointerLeave(slider);
    expect(screen.getByRole('status')).toHaveTextContent('none');
  });

  it('shows the touched position on a tap', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider');
    placePlot(slider);
    fireEvent.pointerDown(slider, {clientX: 100 + 49});
    expect(screen.getByRole('status')).toHaveTextContent('Sep 29');
  });

  it('keeps a tapped position when the finger lifts and focus follows', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider');
    placePlot(slider);
    // A tap fires down, up and then leave, and only then focus.
    fireEvent.pointerDown(slider, {clientX: 100 + 31, pointerType: 'touch'});
    fireEvent.pointerUp(slider, {clientX: 100 + 31, pointerType: 'touch'});
    fireEvent.pointerLeave(slider, {pointerType: 'touch'});
    expect(screen.getByRole('status')).toHaveTextContent('Sep 28');
    act(() => slider.focus());
    expect(screen.getByRole('status')).toHaveTextContent('Sep 28');
  });

  it('pulls a held cursor back into range when the data shrinks', async () => {
    const {rerender} = render(<Harness />);
    await userEvent.tab();
    expect(screen.getByRole('status')).toHaveTextContent('Sep 30');
    act(() => rerender(<Harness days={['Sep 29', 'Sep 30']} />));
    expect(screen.getByRole('status')).toHaveTextContent('Sep 30');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '1');
  });
});
