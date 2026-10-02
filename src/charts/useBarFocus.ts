import {useRef, useState} from 'react';
import type {ChartCursor} from './useChartCursor';

/** Where each key moves the focus from bar `i`; `last` is the newest bar. */
const BAR_KEYS = new Map<string, (i: number, last: number) => number>([
  ['ArrowRight', (i) => i + 1],
  ['ArrowLeft', (i) => i - 1],
  ['Home', () => 0],
  ['End', (_, last) => last],
]);

/** The roving Tab stop: the bar last focused, else the picked bar, else the newest. */
function tabStopOf(focusIndex: number | null, selectedIndex: number, n: number): number {
  if (focusIndex != null && focusIndex < n) return focusIndex;
  return selectedIndex >= 0 ? selectedIndex : n - 1;
}

/** What a key does on bar `i`: a bar to focus (kept on the chart), 'hide' for Escape, or null for a key the bars leave alone. */
function barKey(key: string, i: number, last: number): number | 'hide' | null {
  if (key === 'Escape') return 'hide';
  const move = BAR_KEYS.get(key);
  return move ? Math.min(Math.max(move(i, last), 0), last) : null;
}

/** What a selectable bar's button needs for the roving focus: its ref, its Tab stop, and its keyboard, focus and hover handlers. */
export interface BarButtonProps {
  ref: (el: HTMLButtonElement | null) => void;
  tabIndex: number;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  onPointerEnter: () => void;
}

/**
 * The roving focus over `n` selectable bars: one Tab stop (tabStopOf), ←/→,
 * Home and End between bars, and Escape to hide the tooltip. Focus and hover
 * move the chart's cursor, so the tooltip follows; blur clears it.
 */
export function useBarFocus(n: number, selectedIndex: number, cursor: ChartCursor): (i: number) => BarButtonProps {
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const tabStop = tabStopOf(focusIndex, selectedIndex, n);

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    const action = barKey(event.key, i, n - 1);
    if (action === null) return;
    event.preventDefault();
    if (action === 'hide') cursor.setIndex(null);
    else buttons.current[action]?.focus();
  }

  return (i) => ({
    ref: (el) => {
      buttons.current[i] = el;
    },
    tabIndex: i === tabStop ? 0 : -1,
    onKeyDown: (event) => onKeyDown(event, i),
    onFocus: () => {
      setFocusIndex(i);
      cursor.setIndex(i);
    },
    onBlur: () => cursor.setIndex(null),
    onPointerEnter: () => cursor.setIndex(i),
  });
}
