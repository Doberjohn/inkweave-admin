import {addDays, daySpan} from './scale';

/** The time windows a page offers (R-9). The range control leads the page's filter row. */
export type RangePreset = '7d' | '30d' | '90d' | 'all';

export const RANGE_OPTIONS: ReadonlyArray<{value: RangePreset; label: string}> = [
  {value: '7d', label: '7 days'},
  {value: '30d', label: '30 days'},
  {value: '90d', label: '90 days'},
  {value: 'all', label: 'All'},
];

/** The longest window charted per day. A longer one is charted per week (R-9). */
export const DAILY_BUCKET_LIMIT = 90;

const PRESET_DAYS: Record<Exclude<RangePreset, 'all'>, number> = {'7d': 7, '30d': 30, '90d': 90};

/**
 * The first day of the window that ends on `endDay`, both days included: '7d'
 * ending on Sep 30 starts on Sep 24. It is never before `firstDay`, the data's
 * first day, and 'all' starts there. A `firstDay` after `endDay` (no data yet)
 * gives `endDay`.
 */
export function rangeStartDay(preset: RangePreset, endDay: string, firstDay: string): string {
  const floor = firstDay < endDay ? firstDay : endDay;
  if (preset === 'all') return floor;
  const start = addDays(endDay, 1 - PRESET_DAYS[preset]);
  return start > floor ? start : floor;
}

/** 'week' when the window runs over 90 days (both ends included), else 'day' (R-9). */
export function bucketFor(startDay: string, endDay: string): 'day' | 'week' {
  return daySpan(startDay, endDay) > DAILY_BUCKET_LIMIT ? 'week' : 'day';
}

// The control is a component, so it lives in RangeControl.tsx; re-exported so `charts/range` serves the contract's whole block (R1-9 imports it from here).
export {RangeControl} from './RangeControl';
