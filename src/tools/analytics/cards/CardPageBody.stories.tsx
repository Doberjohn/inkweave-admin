import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import type {FocusHandoff} from '../../../shell/focusHandoff';
import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
import type {UseVoteAnalyticsReturn} from '../useVoteAnalytics';
import type {VoteAnalytics} from '../voteAnalyticsTypes';
import {CardPageBody} from './CardPageBody';
import {CardSwitcher} from './CardSwitcher';
import {REVIEW_PAIRS, SWITCHER_CARDS} from './cardFixtures';
import type {CardPageState} from './cardPageState';

const ANALYTICS: VoteAnalytics = {
  generatedAt: '2026-10-05T04:00:00Z',
  hasRawVotes: true,
  global: {
    totalVotes: 74,
    distinctPairs: REVIEW_PAIRS.length,
    distinctVoters: 12,
    meanGap: -0.2,
    accuracySentiment: null,
    engineSilentPairs: 0,
    weekly: [],
    dimensionFill: null,
  },
  rules: [],
  pairs: [...REVIEW_PAIRS],
};

const LOADED: UseVoteAnalyticsReturn = {data: ANALYTICS, loading: false, error: null};
const LOADING: UseVoteAnalyticsReturn = {data: null, loading: true, error: null};
/** No story takes a handoff: nothing here unmounts the control pressed. */
const NO_HANDOFF: FocusHandoff = {pending: false, request: () => {}, done: () => {}};

interface PageStateStoryProps {
  state: CardPageState;
  analytics: UseVoteAnalyticsReturn;
}

/**
 * The body under the page's own header, as CardAnalyticsPage lays it out, on
 * the bare /cards route. The card state is the view, which has its own stories
 * (R3-6), so these show the states around it. A MemoryRouter: the switcher and
 * the Cards to review links navigate, and nothing here calls useBlocker.
 */
function PageStateStory({state, analytics}: PageStateStoryProps) {
  return (
    <MemoryRouter initialEntries={['/cards']}>
      {/* As in the shell's main column: the layout fills the height, and only its body scrolls. */}
      <div style={{height: '100vh'}}>
        <PageLayout
          title="Card analytics"
          subtitle="Votes, calibration and engine data for one card"
          meta={analytics.data ? <DataAsOf generatedAt={analytics.data.generatedAt} /> : undefined}
          actions={<CardSwitcher cards={SWITCHER_CARDS} />}>
          <CardPageBody
            state={state}
            analytics={analytics}
            voteLog={{data: null, loading: true, error: null}}
            synergies={{data: null, loading: true, error: null, retry: () => {}}}
            getCardById={() => undefined}
            onRetry={() => {}}
            handoff={NO_HANDOFF}
          />
        </PageLayout>
      </div>
    </MemoryRouter>
  );
}

const meta: Meta<typeof PageStateStory> = {
  title: 'Admin/Insights/Card analytics/Page states',
  component: PageStateStory,
  args: {state: {kind: 'pick'}, analytics: LOADED},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** A first visit (R-28): the prompt, and the five cards most worth a look, widest gap first. */
export const PickACard: Story = {};

/** The prompt alone, while vote analytics loads (or after it failed). */
export const PickWhileAnalyticsLoads: Story = {
  args: {analytics: LOADING},
};

/** An id, while the card list loads. */
export const LoadingCards: Story = {
  args: {state: {kind: 'loading'}},
};

/** An id the card list doesn't hold (R-29). */
export const UnknownCard: Story = {
  args: {state: {kind: 'unknown', cardId: '13127'}},
};

/** The card list failed: the error and Retry, on any /cards URL. */
export const FailedCardList: Story = {
  args: {state: {kind: 'failed', error: new Error('Failed to fetch')}, analytics: LOADING},
};
