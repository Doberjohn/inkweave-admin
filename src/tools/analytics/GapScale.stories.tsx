import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../app-bridge';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {fmtGap} from '../../ui/format';
import {GapScale} from './GapScale';
import {verdictFor} from './verdict';

const meta: Meta<typeof GapScale> = {
  title: 'Admin/Insights/Gap scale',
  component: GapScale,
  tags: ['autodocs'],
  // A calibration panel's width. .storybook/preview.tsx mounts AdminStyles and
  // the page background.
  decorators: [
    (Story) => (
      <div style={{maxWidth: 480, padding: SPACING.xxxl, color: ADMIN_COLORS.text, fontFamily: FONTS.body}}>
        <Story />
      </div>
    ),
  ],
  // Both callers colour the dot with the verdict's number colour.
  args: {meanGap: -0.3, color: verdictFor(-0.3).numberColor},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Inside the band: the dot takes the neutral number colour. */
export const WellCalibrated: Story = {};

/** Past the band on the over-rates side: the dot turns the over-rates colour. */
export const RunsGenerous: Story = {args: {meanGap: -0.93, color: verdictFor(-0.93).numberColor}};

/** No gap: the centre tick alone. */
export const NoGap: Story = {args: {meanGap: null, color: verdictFor(null).numberColor}};

const GAPS = [-4, -1.5, -0.93, -0.5, -0.3, 0, 0.3, 0.5, 0.7, 1.5, 4, null];

/** Every band, both clamped ends and no gap, each row labelled with the gap it marks. */
export const Range: Story = {
  render: () => (
    <div style={{display: 'grid', gap: SPACING.lg}}>
      {GAPS.map((gap) => (
        <div
          key={String(gap)}
          style={{display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr)', gap: SPACING.md, alignItems: 'center'}}>
          <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{fmtGap(gap)}</span>
          <GapScale meanGap={gap} color={verdictFor(gap).numberColor} />
        </div>
      ))}
    </div>
  ),
};
