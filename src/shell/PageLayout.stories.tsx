import type {Meta, StoryObj} from '@storybook/react-vite';
import {CtaButton} from '../app-bridge';
import {PageLayout} from './PageLayout';

const meta: Meta<typeof PageLayout> = {
  title: 'Admin/PageLayout',
  component: PageLayout,
  args: {
    children: (
      <>
        <p style={{margin: 0}}>A section of the page.</p>
        <p style={{margin: 0}}>The next section, one grid gap below.</p>
      </>
    ),
  },
  // As in the shell's main column: the layout fills the height, and only its body scrolls.
  decorators: [
    (Story) => (
      <div style={{height: '100vh'}}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** A read-only page: meta and actions beside the title, and no branch notice (decision R-4). */
export const ReadOnly: Story = {
  args: {
    title: 'Vote activity',
    subtitle: 'Who votes, and on what.',
    meta: (
      <>
        Data as of <code>2026-09-30</code>
      </>
    ),
    actions: <CtaButton variant="neutral">Refresh</CtaButton>,
  },
};

/** A page that writes: the branch notice names the app branch it commits to. */
export const Writes: Story = {
  args: {title: 'Card images', writes: true},
};

/** A page that writes, with its own notice label. */
export const WritesWithLabel: Story = {
  args: {title: 'Calibration & tuning', writes: true, branchLabel: 'Tuning writes to'},
};
