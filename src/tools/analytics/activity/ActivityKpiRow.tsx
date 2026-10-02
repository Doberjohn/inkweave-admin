import {SPACING} from '../../../app-bridge';
import {fmtInt, fmtScore, fmtWeekday} from '../../../ui/format';
import {KpiCard} from '../../../ui/KpiCard';
import type {VoteLogRow} from '../voteLogTypes';
import {activityKpis, countOf} from './activityModel';

interface ActivityKpiRowProps {
  /** The votes in the range that pass the filter row; the picked bar doesn't narrow the KPIs. */
  votes: VoteLogRow[];
  /** Distinct voters in the whole log. */
  voterCount: number;
}

/** The four KPI cards over the range's filtered votes. Unscored votes count as votes, never toward the average. */
export function ActivityKpiRow({votes, voterCount}: ActivityKpiRowProps) {
  const {votes: total, activeVoters, avgScore, busiestDay} = activityKpis(votes);
  return (
    <section
      aria-label="Activity summary"
      style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: SPACING.md}}>
      <KpiCard label="Votes" value={fmtInt(total)} hint="matching filters" />
      <KpiCard label="Active voters" value={fmtInt(activeVoters)} hint={`of ${fmtInt(voterCount)} distinct voters`} />
      <KpiCard label="Average score" value={fmtScore(avgScore, 1)} hint="1–10, scored votes only" />
      <KpiCard
        label="Busiest day"
        value={busiestDay ? fmtWeekday(busiestDay.day) : '—'}
        hint={busiestDay ? countOf(busiestDay.count, 'vote') : undefined}
      />
    </section>
  );
}
