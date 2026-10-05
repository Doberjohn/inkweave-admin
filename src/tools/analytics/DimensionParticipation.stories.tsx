import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../app-bridge';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {DimensionParticipation} from './DimensionParticipation';

const meta: Meta<typeof DimensionParticipation> = {
  title: 'Admin/Insights/Calibration/Dimension participation',
  component: DimensionParticipation,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{maxWidth: 720, padding: SPACING.xxxl, color: ADMIN_COLORS.text, fontFamily: FONTS.body}}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const FILL = {score: 1730, accuracy: 115, isReal: 24, wouldPlay: 24, difficulty: 24};

export const Default: Story = {args: {fill: FILL, totalVotes: 1823}};

/** Under /calibration's scope row, which this panel ignores, so it says what it reads. */
export const Scoped: Story = {args: {fill: FILL, totalVotes: 1823, scope: 'All votes, whatever the rule'}};

export const NoVotes: Story = {args: {fill: null, totalVotes: 0}};
