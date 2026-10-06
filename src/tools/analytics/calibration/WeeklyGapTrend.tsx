import {ChartFrame} from '../../../charts/ChartFrame';
import {LineChart} from '../../../charts/LineChart';
import type {Day} from '../../../charts/scale';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtGap, fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {gapDomain, weekTitle, weeklySubtitle, weeklyTable, type WeeklyGap, type WeeklyScope} from './chartData';

/** The two plots' heights in px: the gap is the story, the score votes its context. */
const GAP_HEIGHT = 160;
const VOTES_HEIGHT = 72;

const MUTED: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/** Names one of the figure's two plots: each has its own y axis, so each says what it measures. */
function PlotCaption({children}: {children: React.ReactNode}) {
  return <p style={{...MUTED, fontWeight: 600}}>{children}</p>;
}

/** Why there is no trend to draw, or null when there is one. */
function emptyReason(weeks: readonly WeeklyGap[]): string | null {
  // A tuning-only row scopes no pairs, so its weeks span the log with no score vote in any of them.
  if (!weeks.some((w) => w.scoreVotes > 0)) return 'No score votes in this scope yet.';
  return weeks.length < 2 ? 'Not enough weeks of votes to draw a trend yet.' : null;
}

/** The scope's name and the log's span (WeeklyScope), and the weeks to draw. */
export interface WeeklyGapTrendProps extends WeeklyScope {
  /** weeklyGaps(votes, scope): every week of the log, oldest first. */
  weeks: readonly WeeklyGap[];
}

/**
 * The scope's weekly mean gap against a "No gap" baseline, with the score
 * votes behind each week in a short area plot underneath. Two plots, one y
 * axis each: never a second axis on one plot. Both are LineCharts over the
 * same weeks with fixed gutters (R2-4a), so a week sits at the same x in both,
 * and a week without score votes breaks the gap line. The dates print once,
 * under the votes plot at the bottom; the gap plot's tooltip and slider value
 * still name each week. The log's first and last weeks are often part weeks
 * (the last is usually the current one), so, as Vote activity does, the
 * subtitle says so and their tooltips, slider values and table rows name the
 * days they cover ("Week of Sep 28 (to Sep 30)"). The untitled Panel is the card.
 */
export function WeeklyGapTrend({weeks, ...scope}: WeeklyGapTrendProps) {
  const {scopeLabel, span} = scope;
  const empty = emptyReason(weeks);
  // A week's tooltip title and slider text, in full; the axis keeps the short "Sep 14".
  const title = (week: Day) => weekTitle({week}, span);
  return (
    <Panel>
      <ChartFrame title="Weekly gap" subtitle={weeklySubtitle(scope)} table={weeklyTable(weeks, scope)}>
        {empty ? (
          <p style={MUTED}>{empty}</p>
        ) : (
          <>
            <PlotCaption>Mean gap</PlotCaption>
            <LineChart
              series={[
                {
                  id: 'gap',
                  label: 'Mean gap',
                  color: ADMIN_COLORS.accent,
                  points: weeks.map((w) => ({x: w.week, y: w.meanGap})),
                },
              ]}
              ariaLabel={`Weekly mean gap, ${scopeLabel}`}
              height={GAP_HEIGHT}
              yFormat={fmtGap}
              xFormat={fmtDay}
              titleFormat={title}
              xTicks={[]}
              baseline={0}
              baselineLabel="No gap"
              // A quiet week has no gap: the slider says why ("Week of Sep 21: no score votes"), the tooltip "—".
              missingText="no score votes"
              yDomain={gapDomain(weeks)}
              fixedGutters
            />
            <PlotCaption>Score votes</PlotCaption>
            <LineChart
              series={[
                {
                  id: 'votes',
                  label: 'Score votes',
                  color: ADMIN_COLORS.barNeutral,
                  points: weeks.map((w) => ({x: w.week, y: w.scoreVotes})),
                },
              ]}
              ariaLabel={`Score votes per week, ${scopeLabel}`}
              height={VOTES_HEIGHT}
              area
              yFormat={fmtInt}
              xFormat={fmtDay}
              titleFormat={title}
              fixedGutters
            />
          </>
        )}
      </ChartFrame>
    </Panel>
  );
}
