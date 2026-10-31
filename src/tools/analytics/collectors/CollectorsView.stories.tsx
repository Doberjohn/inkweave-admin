import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {COUNTS} from './collectorFixtures';
import {CollectorsView} from './CollectorsView';

const meta: Meta<typeof CollectorsView> = {
  title: 'Admin/Insights/Collectors',
  component: CollectorsView,
  parameters: {layout: 'fullscreen'},
  tags: ['autodocs'],
  // The page body's frame: PageLayout's padding on the admin page colour.
  decorators: [
    (Story) => (
      <div
        style={{
          background: ADMIN_COLORS.page,
          color: ADMIN_COLORS.text,
          fontFamily: FONTS.body,
          padding: `${SPACING.xxl}px ${SPACING.xxxl}px`,
          minHeight: '100vh',
        }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Four start weeks; the newest is too new for anyone to have saved a week in. */
export const Counts: Story = {args: {analytics: COUNTS}};

export const NoCollectors: Story = {
  args: {analytics: {...COUNTS, collectors: 0, new7: 0, returning7: 0, returning30: 0, cameBack: 0, weeks: []}},
};

/** Deployed without SUPABASE_SERVICE_ROLE_KEY. */
export const NoKey: Story = {args: {analytics: {generatedAt: COUNTS.generatedAt, hasData: false, reason: 'no-key'}}};

/** The deploy couldn't read the collections table. */
export const ReadFailed: Story = {
  args: {analytics: {generatedAt: COUNTS.generatedAt, hasData: false, reason: 'read-failed'}},
};

export const NotGenerated: Story = {
  args: {analytics: null, error: new Error('collector-analytics.json has not been generated yet')},
};

export const Loading: Story = {args: {analytics: null}};
