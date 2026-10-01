import {useState} from 'react';
import {nearestIndex} from './scale';

export interface ChartCursor {
  /** The position the tooltip and crosshair show, or null for none (also after Escape, which keeps the slider's value). */
  index: number | null;
  setIndex: (i: number | null) => void;
  /** Props to spread onto the plot element. Name the plot with its own aria-label. */
  plotProps: (valueText: (i: number) => string, xs: readonly number[]) => React.HTMLAttributes<HTMLElement>;
}

/**
 * The cursor over a chart's `n` positions (days, weeks, bars): which one the
 * tooltip and crosshair show, from the pointer or the keyboard.
 *
 * plotProps makes the plot one slider (the WAI-ARIA slider pattern). Its value
 * is the position and its value text is the line the tooltip shows, so
 * keyboard and screen-reader users get what hover gives (dataviz: tooltips
 * enhance, never gate). Focus shows the newest position; ←/→ (and ↓/↑) step,
 * Home and End jump, and Escape hides the tooltip without moving focus or the
 * slider's value (WCAG 1.4.13), so nothing is announced and the next step goes
 * on from there. The pointer snaps to the nearest of `xs`, each position's x in
 * px from the plot's left edge, so nobody has to land on a 2px line. A touch
 * drag scrubs (AdminStyles' adm-chart-plot only lets the page pan vertically),
 * and a tap keeps its position when the finger lifts.
 */
export function useChartCursor(n: number): ChartCursor {
  const [held, setHeld] = useState<number | null>(null);
  // Escape hides the tooltip but keeps the place, so the slider's value doesn't jump.
  const [hidden, setHidden] = useState(false);
  const last = n - 1;
  const clampIndex = (i: number) => Math.min(Math.max(i, 0), last);
  // New data can shrink n under a held cursor; it snaps back into range.
  const position = held == null || n === 0 ? null : clampIndex(held);
  const index = hidden ? null : position;
  const setIndex = (i: number | null) => {
    setHidden(false);
    setHeld(i == null || n === 0 ? null : clampIndex(i));
  };

  function plotProps(valueText: (i: number) => string, xs: readonly number[]): React.HTMLAttributes<HTMLElement> {
    const resting = position ?? Math.max(last, 0);
    const follow = (event: React.PointerEvent<HTMLElement>) =>
      setIndex(nearestIndex(xs, event.clientX - event.currentTarget.getBoundingClientRect().left));
    return {
      role: 'slider',
      tabIndex: n > 0 ? 0 : -1,
      'aria-valuemin': 0,
      'aria-valuemax': Math.max(last, 0),
      'aria-valuenow': resting,
      'aria-valuetext': n > 0 ? valueText(resting) : undefined,
      onFocus: () => setIndex(resting),
      onBlur: () => setIndex(null),
      onKeyDown: (event) => {
        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowUp':
            setIndex(resting + 1);
            break;
          case 'ArrowLeft':
          case 'ArrowDown':
            setIndex(resting - 1);
            break;
          case 'Home':
            setIndex(0);
            break;
          case 'End':
            setIndex(last);
            break;
          case 'Escape':
            setHidden(true);
            break;
          default:
            return;
        }
        event.preventDefault();
      },
      onPointerMove: follow,
      onPointerDown: follow,
      // A lifted finger fires pointerleave too (touch has no hover), and then focus
      // lands: clearing here would swap the tapped position for the newest.
      onPointerLeave: (event) => {
        if (event.pointerType !== 'touch') setIndex(null);
      },
    };
  }

  return {index, setIndex, plotProps};
}
