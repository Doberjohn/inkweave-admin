import {LinkButton, SPACING} from '../../../app-bridge';
import {RangeControl} from '../../../charts/range';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {SegmentedControl} from '../../../ui/SegmentedControl';
import {BAND_LABELS, SCORE_BANDS, hasActiveFilters, type ActivityFilters, type BandFilter} from './activityModel';

const BAND_OPTIONS: ReadonlyArray<{value: BandFilter; label: string}> = [
  {value: 'all', label: 'All'},
  ...SCORE_BANDS.map((band) => ({value: band, label: BAND_LABELS[band]})),
];

interface ActivityFilterBarProps {
  filters: ActivityFilters;
  /** Distinct voters in the whole log; the select offers Voter 1 to N. */
  voterCount: number;
  onChange: (patch: Partial<ActivityFilters>) => void;
  onClear: () => void;
}

/**
 * The filter row, which scopes everything below it: the range first (R-9),
 * then pair search, voter and score band, and "Clear filters" once one of
 * those or a picked bar is set. Clearing keeps the range, the window the page
 * reads; the view's onClear resets the rest.
 */
export function ActivityFilterBar({filters, voterCount, onChange, onClear}: ActivityFilterBarProps) {
  return (
    <div style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.md}}>
      <RangeControl value={filters.range} onChange={(range) => onChange({range})} />
      <input
        type="search"
        className="adm-input"
        aria-label="Search pairs"
        placeholder="Search pairs"
        value={filters.q}
        onChange={(e) => onChange({q: e.target.value})}
        style={{flex: '1 1 220px', maxWidth: 320}}
      />
      <select
        className="adm-select"
        aria-label="Filter by voter"
        value={filters.voter ?? ''}
        onChange={(e) => onChange({voter: e.target.value === '' ? null : Number(e.target.value)})}>
        <option value="">All voters</option>
        {Array.from({length: voterCount}, (_, i) => i + 1).map((voter) => (
          <option key={voter} value={voter}>
            Voter {voter}
          </option>
        ))}
      </select>
      <div style={{display: 'flex', alignItems: 'center', gap: SPACING.sm}}>
        {/* The visual label; the group's own name ("Filter by score") is what screen readers hear. */}
        <span aria-hidden="true" style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
          Score
        </span>
        <SegmentedControl
          options={BAND_OPTIONS}
          value={filters.band}
          onChange={(band) => onChange({band})}
          ariaLabel="Filter by score"
        />
      </div>
      {hasActiveFilters(filters) && (
        <LinkButton type="button" tone="muted" size="sm" onClick={onClear}>
          Clear filters
        </LinkButton>
      )}
    </div>
  );
}
