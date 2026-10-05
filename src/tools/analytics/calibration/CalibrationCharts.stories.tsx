import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import type {PairStat} from '../voteAnalyticsTypes';
import type {VoteLogRow} from '../voteLogTypes';
import {CalibrationScatter} from './CalibrationScatter';
import {GapHistogram} from './GapHistogram';
import {WeeklyGapTrend} from './WeeklyGapTrend';
import {weeklyGaps} from './chartData';
import {ALL_PAIRS, ALL_PAIRS_VOTES, ONE_RULE, ONE_RULE_VOTES} from './chartFixtures';

/** R2-6's charts row: the scatter and the histogram two-up from 772px of column (two 376px tracks and the gap), stacked below that. */
const CHARTS_ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 376px), 1fr))',
  gap: SPACING.xl,
  alignItems: 'start',
};

interface CalibrationChartsProps {
  pairs: readonly PairStat[];
  /** The vote log the weekly trend joins to the scope (weeklyGaps). */
  votes: readonly VoteLogRow[];
  scopeLabel: string;
  engineSilentPairs?: number;
  emptyText?: string;
  /** The pair picked when the story opens. */
  initialPair?: {a: string; b: string} | null;
}

/** The three charts as R2-6 lays them out, with the scatter's pick held in state as the workspace holds it. */
function CalibrationCharts({pairs, votes, scopeLabel, engineSilentPairs, emptyText, initialPair = null}: CalibrationChartsProps) {
  const [pair, setPair] = useState(initialPair);
  return (
    <>
      <div style={CHARTS_ROW}>
        <CalibrationScatter
          pairs={pairs}
          scopeLabel={scopeLabel}
          selectedPair={pair}
          onSelectPair={setPair}
          engineSilentPairs={engineSilentPairs}
          emptyText={emptyText}
        />
        <GapHistogram pairs={pairs} scopeLabel={scopeLabel} emptyText={emptyText} />
      </div>
      <WeeklyGapTrend weeks={weeklyGaps(votes, pairs)} scopeLabel={scopeLabel} />
    </>
  );
}

const meta: Meta<typeof CalibrationCharts> = {
  title: 'Admin/Insights/Calibration/Charts',
  component: CalibrationCharts,
  // The left column of /calibration at the usual desktop width (about 800px),
  // on the admin page colour. .storybook/preview.tsx mounts AdminStyles.
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: '100vh',
          padding: `${SPACING.xxl}px ${SPACING.xxxl}px`,
          background: ADMIN_COLORS.page,
          color: ADMIN_COLORS.text,
          fontFamily: FONTS.body,
        }}>
        <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xl, maxWidth: 800}}>
          <Story />
        </div>
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** 400 pairs at real density on "All pairs", with 16 weeks of votes and an engine-silent footnote. */
export const AllPairs: Story = {
  args: {pairs: ALL_PAIRS, votes: ALL_PAIRS_VOTES, scopeLabel: 'All pairs', engineSilentPairs: 37},
};

/** One rule's 60 pairs, with a pair picked: the scatter rings it in the accent. */
export const OneRule: Story = {
  args: {
    pairs: ONE_RULE,
    votes: ONE_RULE_VOTES,
    scopeLabel: 'Ramp',
    emptyText: 'No voted pairs for this rule yet.',
    initialPair: {a: ONE_RULE[0].a, b: ONE_RULE[0].b},
  },
};

/** The trend alone over a log whose eleventh week has no score votes: the gap line breaks there. */
export const QuietWeek: Story = {
  render: () => <WeeklyGapTrend weeks={weeklyGaps(ONE_RULE_VOTES, ONE_RULE)} scopeLabel="Ramp" />,
};

/** A fresh artifact: no pairs on "All pairs", and no score votes for the trend. */
export const Empty: Story = {
  args: {pairs: [], votes: [], scopeLabel: 'All pairs'},
};
