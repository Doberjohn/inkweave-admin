import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import type {RuleStat} from '../voteAnalyticsTypes';
import type {CalibrationRow} from './calibrationModel';
import {RulesTable} from './RulesTable';

const stat = (ruleId: string, scoreVotes: number, meanGap: number | null): RuleStat => ({
  ruleId,
  ruleName: ruleId,
  category: 'playstyle',
  scoreVotes,
  pairsVoted: Math.round(scoreVotes / 2),
  meanGap,
  accuracySentiment: meanGap == null ? null : -meanGap / 2,
  pairsCovered: scoreVotes * 3,
});

/** A row as buildCalibrationRows makes it: a playstyle under its own tuning key unless `extra` says otherwise. */
const row = (id: string, name: string, extra: Partial<CalibrationRow> = {}): CalibrationRow => ({
  id,
  name,
  category: 'playstyle',
  stat: null,
  tuningKey: id,
  ...extra,
});

const ROWS: CalibrationRow[] = [
  row('ramp', 'Ramp', {stat: stat('ramp', 557, -0.57)}),
  row('shift-targets', 'Shift Targets', {category: 'direct', stat: stat('shift-targets', 214, -0.31)}),
  // A direct rule with no tuning.json copy (R-20).
  row('singer-songs', 'Singer + Songs', {category: 'direct', stat: stat('singer-songs', 143, 0.18), tuningKey: null}),
  // Two of the nine location-* rules, which share the Locations entry.
  row('location-boost', 'Location Boost', {stat: stat('location-boost', 9, 2.44), tuningKey: 'location-control'}),
  row('location-buff', 'Location Buff', {stat: stat('location-buff', 64, -0.12), tuningKey: 'location-control'}),
  row('discard', 'Discard', {stat: stat('discard', 88, 0.62)}),
  row('dwarfs', 'Seven Dwarfs', {stat: stat('dwarfs', 0, null)}),
  // A tuning.json entry no analytics rule reaches.
  row('detective', 'Detectives'),
];

/** What local dev shows with no analytics: tuning.json alone, playstyles then direct rules. */
const TUNING_ONLY: CalibrationRow[] = [
  row('lore-denial', 'Lore Denial'),
  row('location-control', 'Locations'),
  row('ramp', 'Ramp'),
  row('shift-targets', 'Shift Targets', {category: 'direct'}),
];

const meta: Meta<typeof RulesTable> = {
  title: 'Admin/Insights/Calibration/Rules table',
  component: RulesTable,
  tags: ['autodocs'],
  // The left column's width on a desktop page. .storybook/preview.tsx mounts AdminStyles (adm-row-btn).
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
        <div style={{maxWidth: 840}}>
          <Story />
        </div>
      </div>
    ),
  ],
  args: {rows: ROWS, selectedId: null, edited: new Set<string>(), onSelect: () => {}},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Selection as the workspace keeps it: a click selects a rule, a second click goes back to all pairs. */
function Selectable(args: React.ComponentProps<typeof RulesTable>) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const toggle = (id: string) => setSelectedId((current) => (current === id ? null : id));
  return <RulesTable {...args} selectedId={selectedId} onSelect={toggle} />;
}

/** Click, Enter or Space selects. The two location rules show the pending dot of the Locations entry they share. */
export const Default: Story = {
  args: {edited: new Set(['location-control'])},
  render: (args) => <Selectable {...args} />,
};

export const RuleSelected: Story = {args: {selectedId: 'ramp'}};

/** A rule under 10 score votes, selected: "low n" beside its name. */
export const LowSampleSelected: Story = {args: {selectedId: 'location-boost'}};

/** No analytics: every row is a tuning.json entry, with "—" for gap and votes and nothing to sort by. */
export const TuningOnly: Story = {args: {rows: TUNING_ONLY}};

/** No token and no analytics (R-20). R2-6 picks the real text; this one stands in for it. */
export const Empty: Story = {
  args: {rows: [], emptyText: 'No rules to show: vote analytics are missing and tuning.json needs a GitHub token.'},
};
