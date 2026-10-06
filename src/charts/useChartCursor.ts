import {useState} from 'react';
import {nearestIndex} from './scale';

export interface ChartCursor {
  /** The position the tooltip and crosshair show, or null for none (also after Escape, which keeps the slider's value). */
  index: number | null;
  setIndex: (i: number | null) => void;
  /** Props to spread onto the plot element. Name the plot with its own aria-label. */
  plotProps: (valueText: (i: number) => string, xs: readonly number[]) => React.HTMLAttributes<HTMLElement>;
}

/** The props the slider puts on a plot element, and what a plot's `extend` adjusts (ChartPlot). */
export type PlotProps = React.HTMLAttributes<HTMLElement>;

/** Where each key moves the cursor from the slider's value, `resting`; `last` is the final position. */
const SLIDER_KEYS = new Map<string, (resting: number, last: number) => number>([
  ['ArrowRight', (resting) => resting + 1],
  ['ArrowUp', (resting) => resting + 1],
  ['ArrowLeft', (resting) => resting - 1],
  ['ArrowDown', (resting) => resting - 1],
  ['Home', () => 0],
  ['End', (_, last) => last],
]);

/** `i` kept on positions 0 to n − 1, or null for no position (and always with no positions). */
function positionOf(i: number | null, n: number): number | null {
  if (i == null || n === 0) return null;
  return Math.min(Math.max(i, 0), n - 1);
}

/** What a key does from `resting`: a position to move to, 'hide' for Escape, or null for a key the slider leaves alone. */
function sliderKey(key: string, resting: number, last: number): number | 'hide' | null {
  if (key === 'Escape') return 'hide';
  const move = SLIDER_KEYS.get(key);
  return move ? move(resting, last) : null;
}

/** The slider's ARIA: one Tab stop, its range, and its value with the tooltip's line as the value text. */
function sliderAria(n: number, resting: number, valueText: (i: number) => string): PlotProps {
  const some = n > 0;
  return {
    role: 'slider',
    tabIndex: some ? 0 : -1,
    'aria-valuemin': 0,
    'aria-valuemax': Math.max(n - 1, 0),
    'aria-valuenow': resting,
    'aria-valuetext': some ? valueText(resting) : undefined,
  };
}

/** The keyboard: arrows step, Home and End jump, and Escape hides the tooltip but keeps the place. */
function keyHandler(resting: number, last: number, cursor: {setIndex: (i: number) => void; hide: () => void}) {
  return (event: React.KeyboardEvent<HTMLElement>) => {
    const step = sliderKey(event.key, resting, last);
    if (step === null) return;
    event.preventDefault();
    if (step === 'hide') cursor.hide();
    else cursor.setIndex(step);
  };
}

/** The pointer: a move or a press snaps the cursor to the nearest of `xs`, and a mouse or pen leaving clears it. */
function pointerHandlers(xs: readonly number[], setIndex: (i: number | null) => void): PlotProps {
  const follow = (event: React.PointerEvent<HTMLElement>) =>
    setIndex(nearestIndex(xs, event.clientX - event.currentTarget.getBoundingClientRect().left));
  return {
    onPointerMove: follow,
    onPointerDown: follow,
    // A lifted finger fires pointerleave too (touch has no hover), and then focus
    // lands: clearing here would swap the tapped position for the newest.
    onPointerLeave: (event) => {
      if (event.pointerType !== 'touch') setIndex(null);
    },
  };
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
  // New data can shrink n under a held cursor; it snaps back into range.
  const position = positionOf(held, n);
  const setIndex = (i: number | null) => {
    setHidden(false);
    setHeld(positionOf(i, n));
  };

  function plotProps(valueText: (i: number) => string, xs: readonly number[]): PlotProps {
    const resting = position ?? Math.max(n - 1, 0);
    return {
      ...sliderAria(n, resting, valueText),
      onFocus: () => setIndex(resting),
      onBlur: () => setIndex(null),
      onKeyDown: keyHandler(resting, n - 1, {setIndex, hide: () => setHidden(true)}),
      ...pointerHandlers(xs, setIndex),
    };
  }

  return {index: hidden ? null : position, setIndex, plotProps};
}
