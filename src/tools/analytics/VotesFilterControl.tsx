import {SPACING} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../theme/adminTheme';
import {SegmentedControl} from '../../ui/SegmentedControl';
import {VOTES_FILTERS, useVotesFilter, votesFilterById} from './votesFilter';

const OPTIONS = VOTES_FILTERS.map(({id, label}) => ({value: id, label}));

const ROW: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.sm};
const LABEL: React.CSSProperties = {fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

/**
 * The votes filter's control (#33): "Votes", then Any, 2+ and 5+ (R-25). It
 * reads and sets the shared filter itself, so /calibration's scope row and the
 * card page's Voted pairs show one setting, and a step set on one page holds
 * on the other. As in Vote activity's filter row, "Votes" is the visual label
 * and the group's own name, which contains it, is what screen readers hear.
 */
export function VotesFilterControl() {
  const {filter, setFilter} = useVotesFilter();
  return (
    <div style={ROW}>
      <span aria-hidden="true" style={LABEL}>
        Votes
      </span>
      <SegmentedControl
        ariaLabel="Filter pairs by score votes"
        options={OPTIONS}
        value={filter.id}
        onChange={(id) => setFilter(votesFilterById(id))}
      />
    </div>
  );
}
