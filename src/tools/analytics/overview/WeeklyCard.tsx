import {useRef, type CSSProperties} from 'react';
import {SPACING, useContainerWidth} from '../../../app-bridge';
import {BAR_Y_AXIS_WIDTH, BarChart, type BarDatum} from '../../../charts/BarChart';
import {ChartFrame, type ChartTable} from '../../../charts/ChartFrame';
import type {TooltipContent} from '../../../charts/ChartTooltip';
import type {SeriesDef} from '../../../charts/series';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtGap, fmtInt} from '../../../ui/format';
import {Notice} from '../../../ui/Notice';
import {Panel} from '../../../ui/Panel';
import {gapColor} from '../gapColor';
import {WEEKS_SHOWN, recentWeeks, weeksThatFit} from './overviewStats';
import type {WeeklyPoint} from '../voteAnalyticsTypes';

const TITLE = 'Weekly activity';

/**
 * One series, so no legend: the title names it. With emphasisKey, BarChart
 * draws the newest week in the accent and the rest in this neutral, which
 * clears 3:1 on a card (R1-2's chart-marks test).
 */
const VOTES: readonly SeriesDef[] = [{id: 'votes', label: 'Votes', color: ADMIN_COLORS.barNeutral}];

const SMALL_MUTED: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/** "Week of Sep 28", then the votes and the mean gap; a week without score votes reads "—" for its gap. */
function weekTooltip(w: WeeklyPoint): TooltipContent {
  return {
    title: `Week of ${fmtDay(w.week)}`,
    rows: [
      {label: 'Votes', value: fmtInt(w.votes)},
      {label: 'Mean gap', value: fmtGap(w.meanGap)},
    ],
  };
}

/**
 * The gap under a week's date, in its over/under colour (gapColor, which mutes
 * a gap that prints "0.00"); nothing for a week without score votes.
 */
function gapLine(w: WeeklyPoint): {text: string; color: string} | null {
  if (w.meanGap == null) return null;
  return {text: fmtGap(w.meanGap), color: gapColor(w.meanGap)};
}

/** The table view: every week of the window, oldest first, the narrow card's dropped weeks included. */
function weekTable(weeks: WeeklyPoint[]): ChartTable {
  return {
    caption: 'Votes and mean gap per week',
    columns: ['Week', 'Votes', 'Mean gap'],
    rows: weeks.map((w) => [fmtDay(w.week), fmtInt(w.votes), fmtGap(w.meanGap)]),
  };
}

/**
 * The card's chart branch, in its own component so it owns the measured ref.
 * useContainerWidth observes only the element its ref held at mount (its
 * effect depends on the ref object alone), and this mounts only once there are
 * weeks to chart, so a card that first showed its notice or its empty state
 * still measures when the weeks arrive. `recent` is never empty.
 */
function WeeklyChart({recent, latestDay}: {recent: WeeklyPoint[]; latestDay?: string}) {
  // On a wrapper around the whole frame, which stays mounted in both views: a
  // ref inside the chart view would go stale after a trip to the table.
  const frameRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(frameRef);
  // weeksThatFit counts slots across the plot: the frame less BarChart's y-axis
  // gutter and its 8px right pad (SPACING.sm, R1-3b). Unmeasured (0) stays 0, the
  // whole window; a measured width never drops to 0, which weeksThatFit would read
  // as unmeasured.
  const fit = weeksThatFit(width > 0 ? Math.max(1, width - BAR_Y_AXIS_WIDTH - SPACING.sm) : 0);
  const shown = recent.slice(-fit);
  const data: BarDatum[] = shown.map((w) => ({key: w.week, label: fmtDay(w.week), values: {votes: w.votes}}));
  const byWeek = new Map(shown.map((w) => [w.week, w]));
  // Every datum comes from `shown`, so the fallback never runs; it keeps the type a WeeklyPoint.
  const pointOf = (d: BarDatum): WeeklyPoint =>
    byWeek.get(d.key) ?? {week: d.key, votes: d.values.votes, meanGap: null};
  return (
    // ChartFrame titles the card with its h2, so the Panel is the surface only.
    <Panel>
      <div ref={frameRef}>
        <ChartFrame title={TITLE} subtitle="Votes per week · the mean gap under each date" table={weekTable(recent)}>
          <BarChart
            data={data}
            series={VOTES}
            ariaLabel="Votes per week"
            valueFormat={fmtInt}
            tooltip={(d) => weekTooltip(pointOf(d))}
            capLabels="extremes"
            emphasisKey={shown[shown.length - 1].week}
            subLabel={(d) => gapLine(pointOf(d))}
          />
        </ChartFrame>
      </div>
      <p style={SMALL_MUTED}>
        Labels are the week&apos;s Monday. Bars are Monday-start weeks; the last bar runs through the latest vote
        {latestDay ? ` (${fmtDay(latestDay)})` : ''}.
      </p>
    </Panel>
  );
}

interface WeeklyCardProps {
  weekly: WeeklyPoint[];
  hasRawVotes: boolean;
  /** The newest vote's day (YYYY-MM-DD), once the vote log has loaded. */
  latestDay?: string;
}

/**
 * Votes and mean gap per Monday-start week, on the chart kit (R1-3b): the
 * last 12 weeks (R-9), of which the chart shows as many as fit the plot at
 * 44px a slot, newest last, so it never scrolls. The newest week is the
 * emphasised bar. Cap labels stay on 'extremes' (this week and the busiest
 * one), because the gap under every date is already one number per column;
 * the y ticks, the tooltip and the table carry the rest. The table view holds
 * the whole window, including weeks a narrow card leaves out. Weekly points
 * come from the raw vote log, so without raw votes the card says how to enable
 * them (RawVotesNotice's copy, minus the panels that now live on Calibration).
 */
export function WeeklyCard({weekly, hasRawVotes, latestDay}: WeeklyCardProps) {
  if (!hasRawVotes) {
    return (
      <Panel title={TITLE}>
        <Notice>
          Weekly activity and voter counts need raw votes. Set the <code>SUPABASE_SERVICE_ROLE_KEY</code> Actions
          secret, then re-run admin&apos;s Deploy workflow to enable them.
        </Notice>
      </Panel>
    );
  }
  const recent = recentWeeks(weekly, WEEKS_SHOWN);
  if (recent.length === 0) {
    return (
      <Panel title={TITLE}>
        <p style={SMALL_MUTED}>No votes yet.</p>
      </Panel>
    );
  }
  return <WeeklyChart recent={recent} latestDay={latestDay} />;
}
