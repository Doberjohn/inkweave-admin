import type {CSSProperties} from 'react';
import {SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';

/*
 * A legend's look, shared by the chart kit's ChartLegend and SplitMeter's
 * legend, which sits beside charts and keys its parts the same way: on the
 * card page the accuracy split sits beside the Community scores histogram.
 */

/** A swatch's side, in px: 10 (SPACING.md − SPACING.xxs), not the handoff's 8. */
export const LEGEND_SWATCH = SPACING.md - SPACING.xxs;

/** The list: wrapping rows of label-size text, muted, never the series colour. */
export const LEGEND_LIST: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: `${SPACING.xs}px ${SPACING.lg}px`,
  margin: 0,
  padding: 0,
  listStyle: 'none',
  fontSize: ADMIN_TYPE.label,
  color: ADMIN_COLORS.muted,
};

/** One entry: its swatch, then its text. */
export const LEGEND_ITEM: CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: SPACING.xs};
