import type {Meta, StoryObj} from '@storybook/react-vite';
import {CtaButton, SPACING} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';
import {DataAsOf} from '../ui/DataAsOf';
import {PAGE_GUTTER, PageLayout} from './PageLayout';

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
    meta: <DataAsOf generatedAt="2026-09-30T04:00:00.000Z" />,
    actions: <CtaButton variant="neutral">Refresh</CtaButton>,
  },
};

/** A page that writes: the branch notice names the app branch it commits to. */
export const Writes: Story = {
  args: {title: 'Card images', writes: true},
};

/** A page that writes, with its own notice label. */
export const WritesWithLabel: Story = {
  args: {title: 'Calibration & tuning', writes: true, branchLabel: 'Tuning writes to Doberjohn/inkweave'},
};

/** A flush body: no padding and no grid, so the page lays out its own columns edge to edge (R2's aside). */
export const Flush: Story = {
  args: {
    title: 'Calibration & tuning',
    writes: true,
    branchLabel: 'Tuning writes to Doberjohn/inkweave',
    flush: true,
    children: (
      <div style={{display: 'flex', flexWrap: 'wrap', minHeight: '100%'}}>
        <p style={{flex: '999 1 520px', margin: 0, padding: `${SPACING.xxl}px ${PAGE_GUTTER}`}}>The left column.</p>
        <p style={{flex: '1 1 340px', margin: 0, padding: SPACING.xxl, background: ADMIN_COLORS.aside}}>The aside.</p>
      </div>
    ),
  },
};
