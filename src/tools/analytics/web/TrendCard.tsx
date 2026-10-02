import {FONTS, SPACING} from '../../../app-bridge';
import {ChartFrame, type ChartTable} from '../../../charts/ChartFrame';
import {LineChart, type LineSeries} from '../../../charts/LineChart';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import type {TrendPoint, VercelEvent} from '../vercelAnalyticsTypes';
import {trendSummary} from './webModel';

/** The plot's height in px, the handoff's 180px area chart. */
const CHART_HEIGHT = 180;

const fmtAverage = (n: number) => n.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1});

function Stat({label, value}: {label: string; value: string}) {
  return (
    <div>
      <dt style={{fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{label}</dt>
      <dd
        style={{
          margin: 0,
          fontFamily: FONTS.hero,
          fontSize: ADMIN_TYPE.sectionTitle,
          lineHeight: 1.1,
          color: ADMIN_COLORS.text,
        }}>
        {value}
      </dd>
    </div>
  );
}

/** "Sep 12 to Sep 30"; the day alone for a one-day trend; null with no days. */
function spanOf(trend: TrendPoint[]): string | null {
  if (trend.length === 0) return null;
  const from = fmtDay(trend[0].date);
  return trend.length === 1 ? from : `${from} to ${fmtDay(trend[trend.length - 1].date)}`;
}

/** The chart's table twin: every day of the window, idle ones as 0. */
function trendTable(caption: string, trend: TrendPoint[]): ChartTable {
  return {caption, columns: ['Day', 'Count'], rows: trend.map((point) => [fmtDay(point.date), fmtInt(point.count)])};
}

/**
 * The selected event's daily trend over the reporting window, on the chart
 * kit (R-12). The frame's header holds the window total, the daily average and
 * the peak day; below it sits one area series in the accent, the selected
 * event, so the title names it and there is no legend. Hover, or the arrow
 * keys on the focused plot, snap a crosshair to a day, and its tooltip reads
 * the day and the count ("Sep 30", "5"). The Chart | Table toggle swaps the
 * chart for every day of the window, so the tooltip never gates a value.
 *
 * The trend arrives filled to every day of the window (WebAnalyticsBody runs
 * it through fillTrendDays), so the average, the axis, the crosshair and the
 * table all count idle days. An event with no activity in the window (no days,
 * or only zero days) says so instead of drawing a flat line at 0, and shows "—"
 * for the average and the peak; its table still lists the idle days.
 */
export function TrendCard({event}: {event: VercelEvent}) {
  const {trend} = event;
  const {inWindow, dailyAverage, peak} = trendSummary(trend);
  // Only zero days (the filled idle window), or no days at all (no window and no data): nothing to chart.
  const active = inWindow > 0;
  const title = `${event.label} per day`;
  const span = spanOf(trend);
  // The chart's and the table's name: the title plus the days it covers.
  const name = span ? `${title}, ${span}` : title;
  const series: LineSeries[] = [
    {
      id: event.name,
      label: event.label,
      color: ADMIN_COLORS.accent,
      points: trend.map((point) => ({x: point.date, y: point.count})),
    },
  ];
  return (
    // ChartFrame draws no surface (R1-3b), so an untitled Panel is the card and the frame's title is its title.
    <Panel>
      <ChartFrame
        title={title}
        subtitle={`${fmtInt(event.visitors)} visitors all-time`}
        actions={
          <dl style={{display: 'flex', flexWrap: 'wrap', gap: `${SPACING.md}px ${SPACING.xxl}px`, margin: 0}}>
            <Stat label="In window" value={fmtInt(inWindow)} />
            <Stat label="Daily average" value={active ? fmtAverage(dailyAverage) : '—'} />
            <Stat label="Peak day" value={active && peak ? fmtDay(peak.date) : '—'} />
          </dl>
        }
        table={trendTable(name, trend)}>
        {active ? (
          // Keyed by event: picking another event starts its crosshair afresh,
          // while the frame keeps the Chart | Table choice.
          <LineChart
            key={event.name}
            series={series}
            ariaLabel={name}
            height={CHART_HEIGHT}
            area
            yFormat={fmtInt}
            xFormat={fmtDay}
          />
        ) : (
          <p style={{margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted}}>No activity in window.</p>
        )}
      </ChartFrame>
    </Panel>
  );
}
