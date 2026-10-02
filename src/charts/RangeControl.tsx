import {SegmentedControl} from '../ui/SegmentedControl';
import {RANGE_OPTIONS, type RangePreset} from './range';

interface RangeControlProps {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
}

/**
 * The time-range presets (7 days, 30 days, 90 days, All) as a segmented
 * control named "Range". It goes first in a page's filter row, the one row
 * above everything it scopes (R-9; dataviz: the date range comes before every
 * other filter). Pressing the current preset does nothing (SegmentedControl).
 */
export function RangeControl({value, onChange}: RangeControlProps) {
  return <SegmentedControl ariaLabel="Range" options={RANGE_OPTIONS} value={value} onChange={onChange} />;
}
