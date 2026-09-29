import {useState} from 'react';
import {COLORS, FONT_SIZES, FONTS, RADIUS, SPACING} from '../../app-bridge';
import {DayGroup} from './DayGroup';
import {groupVotesByDay} from './activityStats';
import type {VoteLog} from './voteLogTypes';

interface ActivityViewProps {
  voteLog: VoteLog;
}

/** Why there is nothing to list: no raw votes at all, or none from the chosen voter. */
function emptyMessage(totalVotes: number, voter: number | null): string {
  if (totalVotes > 0 && voter !== null) return `No votes from voter ${voter} in this log.`;
  return "No raw votes yet. Set the SUPABASE_SERVICE_ROLE_KEY Actions secret, then re-run admin's Deploy workflow.";
}

/**
 * Activity tab: the raw vote log rendered day by day. A voter filter narrows
 * the log to a single voter token before grouping; each day is a collapsible
 * DayGroup (the newest day starts open).
 */
export function ActivityView({voteLog}: ActivityViewProps) {
  const [voterFilter, setVoterFilter] = useState<number | null>(null);

  const filtered =
    voterFilter === null ? voteLog.votes : voteLog.votes.filter((v) => v.voter === voterFilter);
  const days = groupVotesByDay(filtered);
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  const voterOptions = Array.from({length: voteLog.voterCount}, (_, i) => i + 1);

  return (
    <section>
      <header style={{marginBottom: SPACING.md}}>
        <h2 style={{fontSize: FONT_SIZES.xl, fontWeight: 700, margin: 0, color: COLORS.text}}>Activity</h2>
        <p style={{fontSize: FONT_SIZES.base, color: COLORS.textMuted, margin: `${SPACING.xs}px 0 0`}}>
          day by day - click a day to see every vote
        </p>
      </header>

      <div style={{display: 'flex', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md}}>
        <label htmlFor="activity-voter-filter" style={{fontSize: FONT_SIZES.base, color: COLORS.textMuted}}>
          Voter
        </label>
        <select
          id="activity-voter-filter"
          aria-label="Filter by voter"
          value={voterFilter ?? ''}
          onChange={(e) => setVoterFilter(e.target.value === '' ? null : Number(e.target.value))}
          style={{
            padding: '6px 8px',
            borderRadius: RADIUS.md,
            border: `1px solid ${COLORS.surfaceBorder}`,
            fontSize: FONT_SIZES.base,
            fontFamily: FONTS.body,
            background: COLORS.surface,
            color: COLORS.text,
            cursor: 'pointer',
          }}>
          <option value="">All voters</option>
          {voterOptions.map((voter) => (
            <option key={voter} value={voter}>
              Voter {voter}
            </option>
          ))}
        </select>
      </div>

      {days.length === 0 ? (
        <div
          style={{
            padding: SPACING.md,
            background: COLORS.surfaceAlt,
            border: `1px dashed ${COLORS.surfaceBorder}`,
            borderRadius: RADIUS.lg,
            fontSize: FONT_SIZES.base,
            color: COLORS.textMuted,
          }}>
          {emptyMessage(voteLog.votes.length, voterFilter)}
        </div>
      ) : (
        <div>
          {days.map((day, i) => (
            <DayGroup key={day.day} group={day} maxCount={maxCount} defaultOpen={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}
