import type {Meta, StoryObj} from '@storybook/react-vite';
import {SPACING} from '../../app-bridge';
import {VotesFilterControl} from './VotesFilterControl';
import {VOTES_FILTERS, setVotesFilter} from './votesFilter';

const meta: Meta<typeof VotesFilterControl> = {
  title: 'Admin/Insights/Votes filter',
  component: VotesFilterControl,
  // .storybook/preview.tsx puts the filter back to Any before every story.
  decorators: [
    (Story) => (
      <div style={{padding: SPACING.xxxl}}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Off, as every page opens after a reload: Any. */
export const Any: Story = {};

/** At 2+: /calibration's scope row and the card page's Voted pairs both show it pressed. */
export const TwoPlus: Story = {
  beforeEach: () => setVotesFilter(VOTES_FILTERS[1]),
};
