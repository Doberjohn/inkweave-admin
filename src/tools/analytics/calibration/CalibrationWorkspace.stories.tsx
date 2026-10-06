import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {TUNING} from 'inkweave-synergy-engine';
import {PageLayout} from '../../../shell/PageLayout';
import {useTuningAdmin} from '../../tuning/useTuningAdmin';
import type {UseVoteAnalyticsReturn} from '../useVoteAnalytics';
import type {UseVoteLogReturn} from '../useVoteLog';
import type {PairStat, RuleStat, VoteAnalytics} from '../voteAnalyticsTypes';
import {CalibrationWorkspace} from './CalibrationWorkspace';
import type {TuningState} from './TuningAside';
import {calibrationSubtitle} from './calibrationModel';
import {ALL_PAIRS, ALL_PAIRS_VOTES} from './chartFixtures';

// The 400 pairs R2-4c's AllPairs story draws, spread over three rules, so a
// rule scopes the charts to part of them.
const PAIRS: PairStat[] = ALL_PAIRS.map((pair, i) => ({
  ...pair,
  rules: [['ramp', 'lore-loss'], ['ramp'], ['location-boost']][i % 3],
}));

/** A rule's stat from its pairs: score votes summed, the gap weighted by votes. No playstyleId: the pinned engine maps it. */
function ruleStat(ruleId: string, ruleName: string): RuleStat {
  const pairs = PAIRS.filter((pair) => pair.rules.includes(ruleId));
  const scoreVotes = pairs.reduce((sum, pair) => sum + pair.scoreVotes, 0);
  const meanGap = scoreVotes ? pairs.reduce((sum, pair) => sum + pair.gap * pair.scoreVotes, 0) / scoreVotes : null;
  return {
    ruleId,
    ruleName,
    category: 'playstyle',
    scoreVotes,
    pairsVoted: pairs.length,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 0.2,
  };
}

const RULES: RuleStat[] = [
  ruleStat('ramp', 'Ramp'),
  ruleStat('lore-loss', 'Lore Loss'),
  ruleStat('location-boost', 'Location Boost'),
  ruleStat('location-search', 'Location Search'),
];

const TOTAL_VOTES = PAIRS.reduce((sum, pair) => sum + pair.scoreVotes, 0);

const ANALYTICS: VoteAnalytics = {
  generatedAt: '2026-10-05T04:00:00Z',
  hasRawVotes: true,
  global: {
    totalVotes: TOTAL_VOTES,
    distinctPairs: PAIRS.length,
    distinctVoters: 40,
    meanGap: PAIRS.reduce((sum, pair) => sum + pair.gap * pair.scoreVotes, 0) / TOTAL_VOTES,
    accuracySentiment: null,
    engineSilentPairs: 37,
    weekly: [],
    dimensionFill: {score: TOTAL_VOTES, accuracy: 210, isReal: 90, wouldPlay: 180, difficulty: 40},
  },
  rules: RULES,
  pairs: PAIRS,
};

const LOADED: UseVoteAnalyticsReturn = {data: ANALYTICS, loading: false, error: null};
const VOTE_LOG: UseVoteLogReturn = {
  data: {generatedAt: ANALYTICS.generatedAt, votes: [...ALL_PAIRS_VOTES], voterCount: 40},
  loading: false,
  error: null,
};

// The bundled copy stands in for the live tuning.json, and a reload reads it again.
const READY: TuningState['live'] = {status: 'ready', config: TUNING, reload: () => Promise.resolve(TUNING)};

interface WorkspaceStoryProps {
  analytics: UseVoteAnalyticsReturn;
  voteLog: UseVoteLogReturn;
  /** A saved token: the aside edits the bundled tuning.json with the real edit hook, and stops at staging. */
  withToken: boolean;
  /** ?rule= as the story opens. */
  rule: string | null;
}

/**
 * The page as CalibrationPage lays it out, with ?rule= held in state. A story
 * has no data router, so it renders the workspace without the page's guard.
 * The edit hook is the real one, as in the aside's stories, but the token is
 * no token at all and Publish is held disabled: the hook would otherwise send
 * a real request to api.github.com, so the stories stop at staging.
 */
function WorkspaceStory({analytics, voteLog, withToken, rule}: WorkspaceStoryProps) {
  const [selectedId, setSelectedId] = useState(rule);
  const admin = useTuningAdmin('storybook-no-token');
  const tuning: TuningState | null = withToken ? {live: READY, admin: {...admin, publishDisabled: true}} : null;
  return (
    // As in the shell's main column: the layout fills the height, and only its body scrolls.
    <div style={{height: '100vh'}}>
      <PageLayout
        title="Calibration & tuning"
        subtitle={analytics.loading ? undefined : calibrationSubtitle(analytics.data?.global ?? null)}
        writes
        branchLabel="Tuning writes to Doberjohn/inkweave"
        flush>
        <CalibrationWorkspace
          analytics={analytics}
          voteLog={voteLog}
          tuning={tuning}
          onSaveToken={() => {}}
          onForgetToken={() => {}}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </PageLayout>
    </div>
  );
}

const meta: Meta<typeof WorkspaceStory> = {
  title: 'Admin/Insights/Calibration/Workspace',
  component: WorkspaceStory,
  args: {analytics: LOADED, voteLog: VOTE_LOG, withToken: false, rule: null},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** All pairs at real density, without a token: the analytics in full, the token gate in the aside. */
export const AllPairs: Story = {};

/** A rule picked with a token saved: the charts follow it, and the aside edits its tuning.json entry. */
export const TuningARule: Story = {
  args: {withToken: true, rule: 'ramp'},
};

/** The Locations entry, which several rules share: ?rule= names the key, and its first rule opens. */
export const SharedEntry: Story = {
  args: {withToken: true, rule: 'location-control'},
};

/** No analytics, with a token: the rules come from tuning.json alone. */
export const TuningOnly: Story = {
  args: {
    analytics: {data: null, loading: false, error: new Error('vote-analytics.json has not been generated yet')},
    voteLog: {data: null, loading: false, error: null},
    withToken: true,
  },
};

/** The analytics still loading, without a token. */
export const Loading: Story = {
  args: {
    analytics: {data: null, loading: true, error: null},
    voteLog: {data: null, loading: true, error: null},
  },
};
