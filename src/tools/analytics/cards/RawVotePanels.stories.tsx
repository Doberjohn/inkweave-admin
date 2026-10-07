import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {RawVotePanels, type RawVotePanelsProps} from './RawVotePanels';
import {
  EMPTY_LOG,
  LOADING,
  NOT_GENERATED,
  NO_RAW_ANALYTICS,
  QUICK_ONLY_CARD,
  RAW_ANALYTICS,
  RAW_CARD,
  RAW_LOG,
  THIN_CARD,
  UNVOTED_CARD,
  loaded,
} from './cardFixtures';

/** Card 8001 with both files loaded: every story changes one thing from here. */
const BASE: RawVotePanelsProps = {
  card: RAW_CARD,
  analytics: loaded(RAW_ANALYTICS),
  voteLog: loaded(RAW_LOG),
};

const meta: Meta<typeof RawVotePanels> = {
  title: 'Admin/Insights/Card analytics/Raw-vote panels',
  component: RawVotePanels,
  args: BASE,
  // The card page's body column at a 1440px window (1440 − the 240px sidebar −
  // two 32px gutters), on the admin page colour, so the answers row sits two-up.
  // .storybook/preview.tsx mounts AdminStyles.
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
        <div style={{maxWidth: 1136}}>
          <Story />
        </div>
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Card 8001: a clear peak at 7, quick votes counted under the chart, answers to every question, and a part last week. */
export const Default: Story = {};

/** The same card before vote analytics loads: every panel draws, and the subtitle has no engine clause yet. */
export const BeforeVoteAnalytics: Story = {args: {analytics: LOADING}};

/** Two scored votes a point apart: no peak to name, nothing answered, and quiet weeks since Sep 9. */
export const ThinCard: Story = {args: {card: THIN_CARD}};

/** Only quick votes: the histogram keeps its frame and says why it is empty. */
export const QuickVotesOnly: Story = {args: {card: QUICK_ONLY_CARD}};

/** A card in the card list that no vote names. */
export const NotOnThisCard: Story = {args: {card: UNVOTED_CARD}};

/** An artifact built without SUPABASE_SERVICE_ROLE_KEY: the raw-votes notice. */
export const NoRawVotes: Story = {args: {analytics: loaded(NO_RAW_ANALYTICS), voteLog: loaded(EMPTY_LOG)}};

export const LogLoading: Story = {args: {voteLog: LOADING}};

/** The vote log's 404, as local dev sees it before the owner saves the deployment's files. */
export const LogFailed: Story = {args: {voteLog: NOT_GENERATED}};
