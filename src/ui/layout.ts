import type {CSSProperties} from 'react';
import {SPACING} from '../app-bridge';

/**
 * A row of panels: two side by side once the row holds two `track`-wide
 * columns and the gap, stacked below that (`min(100%, …)` keeps one column
 * from overflowing a narrower row). A chart's padded Panel takes 42px of its
 * track, so the plot is the track less 42px, and ChartTooltip needs 304px of
 * it: a row of charts takes no track under 346px. Moved from R2's calibration
 * workspace (R3-1a).
 */
export function twoUp(track: number): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${track}px), 1fr))`,
    gap: SPACING.xl,
    alignItems: 'start',
  };
}
