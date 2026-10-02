import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {OverviewView} from './OverviewView';
import {
  ANALYTICS,
  EARLY_ANALYTICS,
  EMPTY_VOTE_LOG,
  NO_EVENTS,
  NO_RAW_ANALYTICS,
  NO_VERCEL,
  VERCEL,
  VOTE_LOG,
} from './overviewFixtures';

/**
 * A phone-width content column. The weekly chart's frame gets about 298px of
 * it (the panel's padding and border come off), and its plot 250px (less
 * BarChart's 40px gutter and 8px right pad), so weeksThatFit keeps the newest
 * 5 weeks, at 50px a slot.
 */
const NARROW = 340;

const meta: Meta<typeof OverviewView> = {
  title: 'Admin/Insights/Overview',
  component: OverviewView,
  tags: ['autodocs'],
  // The cards link to other pages, so the story needs a router. The frame
  // stands in for PageLayout's body: the admin page colour and padding.
  // .storybook/preview.tsx already mounts AdminStyles for every story.
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div
          style={{
            background: ADMIN_COLORS.page,
            color: ADMIN_COLORS.text,
            fontFamily: FONTS.body,
            padding: `${SPACING.xxl}px ${SPACING.xxxl}px`,
          }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    analytics: ANALYTICS,
    analyticsState: {loading: false, error: null},
    voteLog: VOTE_LOG,
    voteLogError: null,
    vercel: VERCEL,
    vercelError: null,
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const FullData: Story = {};

/** The weekly card's table view: every week of the window, as a screen reader or a copy-paste wants it. */
export const WeeklyTable: Story = {
  play: async ({canvas, userEvent}) => {
    await userEvent.click(canvas.getByRole('button', {name: 'Table'}));
  },
};

/** At phone width: the cards stack and the weekly chart keeps only the newest weeks that fit. */
export const NarrowCard: Story = {
  decorators: [
    (Story) => (
      <div style={{maxWidth: NARROW}}>
        <Story />
      </div>
    ),
  ],
};

/** A log a few weeks old: four weekly bars with a quiet week, and no rule with 10 score votes yet. */
export const EarlyLog: Story = {args: {analytics: EARLY_ANALYTICS}};

export const Loading: Story = {
  args: {analytics: null, analyticsState: {loading: true, error: null}, voteLog: null, vercel: null},
};

export const NotGenerated: Story = {
  args: {
    analytics: null,
    analyticsState: {loading: false, error: new Error('vote-analytics.json has not been generated yet')},
  },
};

export const NoRawVotes: Story = {args: {analytics: NO_RAW_ANALYTICS, voteLog: EMPTY_VOTE_LOG}};

export const NoVercelData: Story = {args: {vercel: NO_VERCEL}};

export const NoEventsTracked: Story = {args: {vercel: NO_EVENTS}};

export const WebAnalyticsError: Story = {
  args: {vercel: null, vercelError: new Error('vercel-analytics.json: HTTP 500')},
};

export const VoteLogError: Story = {
  args: {voteLog: null, voteLogError: new Error('vote-log.json: HTTP 500')},
};
