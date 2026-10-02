import {useState} from 'react';
import {SPACING} from '../../../app-bridge';
import {Notice} from '../../../ui/Notice';
import type {VoteLog} from '../voteLogTypes';
import {ActivityFilterBar} from './ActivityFilterBar';
import {ActivityKpiRow} from './ActivityKpiRow';
import {TopPairsPanel, TopVotersPanel} from './ActivitySidePanels';
import {LOG_PAGE_SIZE, VoteLogTable} from './VoteLogTable';
import {VotesPerDayChart} from './VotesPerDayChart';
import {bucketTitle} from './activityChart';
import {
  NO_FILTERS,
  activityWindow,
  chartStacks,
  filterVotes,
  votesInBucket,
  votesInRange,
  type ActivityFilters,
  type ChartBucket,
  type DayStack,
} from './activityModel';

interface ActivityViewProps {
  /** The vote-log artifact; `null` with no `error` while it loads. */
  voteLog: VoteLog | null;
  error?: Error | null;
}

/**
 * The log's "Pick a day" select. A bar's column can be under 24px wide (90
 * days, a phone), so the log offers the same pick as a select: the equivalent
 * control WCAG 2.5.8 allows. It shows a bar pick too.
 */
function BucketPicker({bucket, stacks, value, onChange}: {
  bucket: ChartBucket;
  stacks: readonly DayStack[];
  value: string | null;
  onChange: (key: string | null) => void;
}) {
  const day = bucket === 'day';
  return (
    <select
      className="adm-select"
      aria-label={day ? 'Pick a day' : 'Pick a week'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}>
      <option value="">{day ? 'All days' : 'All weeks'}</option>
      {stacks.map((stack) => (
        <option key={stack.day} value={stack.day}>
          {bucketTitle(stack.day, bucket)}
        </option>
      ))}
    </select>
  );
}

/** The page body once the vote log has loaded: the filters' state and everything they narrow. */
function ActivityBody({voteLog}: {voteLog: VoteLog}) {
  const [filters, setFilters] = useState<ActivityFilters>(NO_FILTERS);
  const [limit, setLimit] = useState(LOG_PAGE_SIZE);

  // The window counts back from the whole log's newest vote, so a filter never shifts the days on show.
  const span = activityWindow(voteLog.votes, filters.range);
  if (!span) {
    return (
      <Notice>
        No raw votes yet. Set the <code>SUPABASE_SERVICE_ROLE_KEY</code> Actions secret, then re-run admin&apos;s
        Deploy workflow.
      </Notice>
    );
  }

  const update = (patch: Partial<ActivityFilters>) => {
    const next = {...filters, ...patch};
    // A new range drops the picked bar: its day can fall outside the new window, and past 90 days the bars are weeks.
    if (next.range !== filters.range) next.day = null;
    setFilters(next);
    setLimit(LOG_PAGE_SIZE);
  };
  // Clear filters keeps the range: it is the window the page reads, not a filter inside it.
  const clear = () => update({...NO_FILTERS, range: filters.range});

  const base = filterVotes(votesInRange(voteLog.votes, span.startDay, span.endDay), {...filters, day: null});
  const {bucket, stacks} = chartStacks(base, span.startDay, span.endDay);
  const picked = filters.day;

  return (
    <>
      <ActivityFilterBar filters={filters} voterCount={voteLog.voterCount} onChange={update} onClear={clear} />
      <ActivityKpiRow votes={base} voterCount={voteLog.voterCount} />
      <VotesPerDayChart
        stacks={stacks}
        bucket={bucket}
        startDay={span.startDay}
        endDay={span.endDay}
        selectedKey={picked}
        // A pick of the picked bar clears it, whether the kit hands back its key or null.
        onSelect={(key) => update({day: key === picked ? null : key})}
      />
      <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: SPACING.xl}}>
        <div style={{flex: '999 1 520px', minWidth: 0}}>
          <VoteLogTable
            votes={picked === null ? base : votesInBucket(base, picked, bucket)}
            limit={limit}
            pickedLabel={picked === null ? null : bucketTitle(picked, bucket)}
            voter={filters.voter}
            onShowMore={() => setLimit(limit + LOG_PAGE_SIZE)}
            onPickVoter={(voter) => update({voter})}
            picker={<BucketPicker bucket={bucket} stacks={stacks} value={picked} onChange={(day) => update({day})} />}
          />
        </div>
        <div style={{flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: SPACING.xl}}>
          <TopVotersPanel
            votes={base}
            selectedVoter={filters.voter}
            onToggleVoter={(voter) => update({voter: filters.voter === voter ? null : voter})}
          />
          <TopPairsPanel votes={base} />
        </div>
      </div>
    </>
  );
}

/**
 * The Vote activity page body, as PageLayout's grid items. The range (R-9)
 * and the rest of the filter row narrow everything below them: the KPIs, the
 * chart, the log and the side panels. The bar picked in the chart narrows only
 * the vote log, so the rest keep their context. Every filter change starts the
 * log at its first page again.
 */
export function ActivityView({voteLog, error}: ActivityViewProps) {
  if (error) {
    return <Notice tone="error">Could not load the vote log. Has the artifact been generated? ({error.message})</Notice>;
  }
  if (!voteLog) return <Notice>Loading vote log...</Notice>;
  return <ActivityBody voteLog={voteLog} />;
}
