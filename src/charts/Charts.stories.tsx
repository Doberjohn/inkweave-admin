import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {gapColor} from '../tools/analytics/gapColor';
import {fmtDay, fmtGap, fmtInt} from '../ui/format';
import {Panel} from '../ui/Panel';
import {BarChart, type BarDatum} from './BarChart';
import {ChartFrame, type ChartTable, type ChartView} from './ChartFrame';
import {ChartLegend} from './ChartLegend';
import {LineChart, type LineSeries} from './LineChart';
import {RangeControl} from './RangeControl';
import {bucketFor, rangeStartDay, type RangePreset} from './range';
import {addDays, eachDay, weekStart} from './scale';
import type {SeriesDef} from './series';

const meta: Meta = {
  title: 'Admin/Charts',
  parameters: {layout: 'fullscreen'},
  // The admin page: background, text colour and body font. .storybook/preview.tsx
  // mounts AdminStyles for every story, so the adm-* chart classes are there.
  // ChartFrame draws no surface, so each story puts it in an untitled Panel, as the pages do.
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: '100vh',
          padding: SPACING.xxxl,
          background: ADMIN_COLORS.page,
          color: ADMIN_COLORS.text,
          fontFamily: FONTS.body,
        }}>
        <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xl, maxWidth: 960}}>
          <Story />
        </div>
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj;

const LAST_DAY = '2026-09-30';
const FIRST_DAY = addDays(LAST_DAY, -119);

const BANDS: SeriesDef[] = [
  {id: 'high', label: '7+', color: ADMIN_COLORS.under},
  {id: 'mid', label: '5–6', color: ADMIN_COLORS.barNeutral},
  {id: 'low', label: '≤4', color: ADMIN_COLORS.over},
  {id: 'unscored', label: 'No score', color: ADMIN_COLORS.muted, pattern: 'hatch'},
];
/** The tooltip's band rows, which read after a number ("5 scored 7+"), as R1-9's do. The legend and the table keep BANDS' labels. */
const BAND_ROW_LABELS: Record<string, string> = {
  high: 'scored 7+',
  mid: 'scored 5–6',
  low: 'scored ≤4',
  unscored: 'with no score',
};

/** Day i's band counts: deterministic, with a quiet day every eleventh. */
function bandsOn(i: number): Record<string, number> {
  if (i % 11 === 4) return {};
  return {high: (i * 7) % 9, mid: (i * 5) % 6, low: (i * 3) % 4, unscored: i % 3 === 0 ? 2 : 0};
}

/** 120 days of band counts, ending on LAST_DAY. */
const DAILY: BarDatum[] = eachDay(FIRST_DAY, LAST_DAY).map((day, i) => ({key: day, label: fmtDay(day), values: bandsOn(i)}));

const sum = (d: BarDatum) => Object.values(d.values).reduce((total, v) => total + v, 0);
const bandOf = (d: BarDatum, id: string) => d.values[id] ?? 0;

/** The days from `start` on, or their Monday weeks when the span is over 90 days (R-9). */
function bucketed(start: string): {weekly: boolean; data: BarDatum[]} {
  const days = DAILY.filter((d) => d.key >= start);
  if (bucketFor(start, LAST_DAY) === 'day') return {weekly: false, data: days};
  const weeks = new Map<string, BarDatum>();
  for (const d of days) {
    const monday = weekStart(d.key);
    const week = weeks.get(monday) ?? {key: monday, label: fmtDay(monday), values: {}};
    for (const [band, v] of Object.entries(d.values)) week.values[band] = (week.values[band] ?? 0) + v;
    weeks.set(monday, week);
  }
  return {weekly: true, data: [...weeks.values()]};
}

function bandTooltip(weekly: boolean) {
  return (d: BarDatum) => ({
    title: weekly ? `Week of ${d.label}` : d.label,
    rows: [
      {label: 'votes', value: fmtInt(sum(d))},
      ...BANDS.map((band) => ({label: BAND_ROW_LABELS[band.id], value: fmtInt(bandOf(d, band.id)), color: band.color})),
    ],
  });
}

function bandTable(data: BarDatum[], weekly: boolean): ChartTable {
  return {
    caption: `Votes per ${weekly ? 'week' : 'day'}, by score band`,
    columns: [weekly ? 'Week of' : 'Day', 'Votes', ...BANDS.map((band) => band.label)],
    rows: data.map((d) => [d.label, fmtInt(sum(d)), ...BANDS.map((band) => fmtInt(bandOf(d, band.id)))]),
  };
}

function StackedDemo() {
  const [range, setRange] = useState<RangePreset>('30d');
  const [picked, setPicked] = useState<string | null>(null);
  const start = rangeStartDay(range, LAST_DAY, FIRST_DAY);
  const {weekly, data} = bucketed(start);
  return (
    <>
      {/* The filter row: one row, above everything it scopes. */}
      <div style={{display: 'flex', flexWrap: 'wrap', gap: SPACING.md}}>
        <RangeControl
          value={range}
          onChange={(v) => {
            setRange(v);
            setPicked(null);
          }}
        />
      </div>
      <Panel>
        <ChartFrame
          title={weekly ? 'Votes per week' : 'Votes per day'}
          subtitle={`${fmtDay(start)} – ${fmtDay(LAST_DAY)}. Pick a bar to filter the log; pick it again to clear.`}
          legend={<ChartLegend series={BANDS} mark="rect" />}
          table={bandTable(data, weekly)}>
          <BarChart
            data={data}
            series={BANDS}
            ariaLabel={weekly ? 'Votes per week' : 'Votes per day'}
            tooltip={bandTooltip(weekly)}
            selectedKey={picked}
            onSelect={setPicked}
          />
        </ChartFrame>
      </Panel>
      <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
        Picked: {picked ? fmtDay(picked) : 'none'}
      </p>
    </>
  );
}

/** Stacked score bands with the range control above, and bars that pick a day. "All" (120 days) charts per week. */
export const StackedWithSelection: Story = {render: () => <StackedDemo />};

const WEEKS: BarDatum[] = Array.from({length: 12}, (_, i) => {
  const monday = addDays('2026-07-13', i * 7);
  return {key: monday, label: fmtDay(monday), values: {votes: 40 + ((i * 37) % 90)}};
});
const WEEK_GAPS = [-0.42, 0.18, null, -0.9, 0.05, 0.31, -0.12, 0.66, -0.3, 0, 0.83, -0.57];
const gapOf = (d: BarDatum) => WEEK_GAPS[WEEKS.indexOf(d)] ?? null;
const VOTES: SeriesDef[] = [{id: 'votes', label: 'Votes', color: ADMIN_COLORS.barNeutral}];

/** One series in emphasis: the newest week in the accent, each week's mean gap under its label (the Overview). */
export const SingleSeriesEmphasis: Story = {
  render: () => {
    const latest = WEEKS[WEEKS.length - 1];
    return (
      <Panel>
        <ChartFrame
          title="Weekly activity"
          subtitle="Monday weeks; the last runs through the latest vote."
          table={{
            caption: 'Votes and mean gap per week',
            columns: ['Week of', 'Votes', 'Mean gap'],
            rows: WEEKS.map((d) => [d.label, fmtInt(d.values.votes), fmtGap(gapOf(d))]),
          }}>
          <BarChart
            data={WEEKS}
            series={VOTES}
            ariaLabel="Weekly activity"
            emphasisKey={latest.key}
            tooltip={(d) => ({
              title: `Week of ${d.label}`,
              rows: [
                {label: 'votes', value: fmtInt(d.values.votes)},
                {label: 'mean gap', value: fmtGap(gapOf(d))},
              ],
            })}
            subLabel={(d) => ({text: fmtGap(gapOf(d)), color: gapColor(gapOf(d))})}
          />
        </ChartFrame>
      </Panel>
    );
  },
};

const TREND_DAYS = eachDay('2026-09-01', LAST_DAY);
const EVENTS: LineSeries[] = [
  {
    id: 'searches',
    label: 'Searches',
    color: ADMIN_COLORS.accent,
    points: TREND_DAYS.map((x, i) => ({x, y: 120 + ((i * 37) % 60) + i * 2})),
  },
  {
    id: 'views',
    label: 'Card views',
    color: ADMIN_COLORS.under,
    points: TREND_DAYS.map((x, i) => ({x, y: 40 + ((i * 23) % 35)})),
  },
];

function eventsTable(series: readonly LineSeries[]): ChartTable {
  return {
    caption: 'Events per day, Sep 1 – Sep 30',
    columns: ['Day', ...series.map((s) => s.label)],
    rows: TREND_DAYS.map((day, i) => [fmtDay(day), ...series.map((s) => fmtInt(s.points[i].y ?? 0))]),
  };
}

/** The two event series in a frame with their legend and table. The stories below differ in the view they open on, the wash and the subtitle. */
function EventsChart({subtitle, area = false, defaultView}: {subtitle?: string; area?: boolean; defaultView?: ChartView}) {
  return (
    <Panel>
      <ChartFrame
        title="Events per day"
        subtitle={subtitle}
        legend={<ChartLegend series={EVENTS} mark="line" />}
        table={eventsTable(EVENTS)}
        defaultView={defaultView}>
        <LineChart series={EVENTS} ariaLabel="Events per day" area={area} />
      </ChartFrame>
    </Panel>
  );
}

/** Two series with the area wash: crosshair, every series in the tooltip, end labels, and the legend. */
export const LineTwoSeriesArea: Story = {
  render: () => <EventsChart subtitle="Reporting window Sep 1 – Sep 30" area />,
};

const GAP_TREND: LineSeries[] = [
  {
    id: 'gap',
    label: 'Mean gap',
    color: ADMIN_COLORS.accent,
    // The quiet week keeps its place on the axis with a null value, so the line breaks there.
    points: WEEKS.map((d) => ({x: d.key, y: gapOf(d)})),
  },
];

/** A signed series on one axis through zero, with the labelled baseline (R2's weekly gap trend). The quiet week breaks the line. */
export const LineWithBaseline: Story = {
  render: () => (
    <Panel>
      <ChartFrame
        title="Weekly gap"
        subtitle="Community minus engine, per Monday week"
        table={{
          caption: 'Mean gap per week',
          columns: ['Week of', 'Mean gap'],
          rows: WEEKS.map((d) => [d.label, fmtGap(gapOf(d))]),
        }}>
        <LineChart series={GAP_TREND} ariaLabel="Weekly gap" yFormat={fmtGap} baseline={0} baselineLabel="No gap" />
      </ChartFrame>
    </Panel>
  ),
};

/** The Chart | Table toggle opened on the table: the accessible twin every chart carries. */
export const TableView: Story = {render: () => <EventsChart defaultView="table" />};

/** Empty and all-zero data: the empty text, and a bare 0 to 1 axis. */
export const EmptyStates: Story = {
  render: () => (
    <>
      <Panel>
        <ChartFrame title="Votes per day" table={{caption: 'Votes per day', columns: ['Day', 'Votes'], rows: []}}>
          <BarChart data={[]} series={BANDS} ariaLabel="Votes per day" tooltip={bandTooltip(false)} emptyText="No votes in this range." />
        </ChartFrame>
      </Panel>
      <Panel>
        <ChartFrame
          title="Votes per day"
          subtitle="A quiet week"
          table={bandTable(DAILY.slice(0, 7).map((d) => ({...d, values: {}})), false)}>
          <BarChart
            data={DAILY.slice(0, 7).map((d) => ({...d, values: {}}))}
            series={BANDS}
            ariaLabel="Votes per day"
            tooltip={bandTooltip(false)}
          />
        </ChartFrame>
      </Panel>
    </>
  ),
};
