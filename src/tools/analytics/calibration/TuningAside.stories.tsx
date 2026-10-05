import type {Meta, StoryObj} from '@storybook/react-vite';
import {TUNING} from 'inkweave-synergy-engine';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {useTuningAdmin} from '../../tuning/useTuningAdmin';
import type {RuleStat} from '../voteAnalyticsTypes';
import type {CalibrationRow} from './calibrationModel';
import {TuningAside, type TuningState} from './TuningAside';

type Live = TuningState['live'];

function row(
  id: string,
  name: string,
  tuningKey: string | null,
  meanGap: number | null,
  category: CalibrationRow['category'] = 'playstyle',
): CalibrationRow {
  const stat: RuleStat = {
    ruleId: id,
    ruleName: name,
    category,
    scoreVotes: 557,
    pairsVoted: 40,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 120,
  };
  return {id, name, category, stat, tuningKey};
}

const RAMP = row('ramp', 'Ramp', 'ramp', -0.57);
const SHIFT = row('shift-targets', 'Shift Targets', 'shift-targets', 0.83, 'direct');
const SINGER = row('singer-songs', 'Singer + Songs', null, 0.4, 'direct');
const LOCATIONS = [
  ['location-at-payoff', 'At Location Payoff'],
  ['location-play-trigger', 'Location Play Trigger'],
  ['location-move-trigger', 'Location Move Trigger'],
  ['location-buff', 'Location Buff'],
  ['location-location-ramp', 'Location Ramp'],
  ['location-move', 'Move to Location'],
  ['location-in-play-check', 'Location In-Play Check'],
  ['location-search', 'Location Search'],
  ['location-boost', 'Location Boost'],
].map(([id, name], i) => row(id, name, 'location-control', -(i + 1) / 10));

// The bundled copy stands in for the live tuning.json, and a reload reads it again.
const READY: Live = {status: 'ready', config: TUNING, reload: () => Promise.resolve(TUNING)};

interface AsideStoryProps {
  live: Live | null;
  selected: CalibrationRow | null;
  sharedWith: CalibrationRow[];
}

/**
 * The real edit hook, so a story stages, reverts and clears edits as the page
 * does. The token is no token at all, and Publish is held disabled: the hook
 * would otherwise send a real request to api.github.com, so the stories stop
 * at staging. Forget token only asks (with edits pending) and then does nothing.
 */
function AsideStory({live, selected, sharedWith}: AsideStoryProps) {
  const admin = useTuningAdmin('storybook-no-token');
  return (
    <TuningAside
      tuning={live ? {live, admin: {...admin, publishDisabled: true}} : null}
      onSaveToken={() => {}}
      onForgetToken={() => {}}
      selected={selected}
      sharedWith={sharedWith}
    />
  );
}

const meta: Meta<typeof AsideStory> = {
  title: 'Admin/Insights/Calibration/Tuning aside',
  component: AsideStory,
  args: {live: READY, selected: RAMP, sharedWith: [RAMP]},
  decorators: [
    (Story) => (
      // R2-6's aside at a desktop width, scrolling as the page does, so the tray pins to its foot.
      <aside
        aria-label="Tuning editor"
        style={{width: 380, height: 720, overflowY: 'auto', background: ADMIN_COLORS.aside}}>
        <Story />
      </aside>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof AsideStory>;

export const Editing: Story = {};

export const SharedEntry: Story = {
  args: {selected: LOCATIONS[8], sharedWith: LOCATIONS},
};

export const ShiftTiers: Story = {
  args: {selected: SHIFT, sharedWith: [SHIFT]},
};

export const NoCopy: Story = {
  args: {selected: SINGER, sharedWith: []},
};

export const NoSelection: Story = {
  args: {selected: null, sharedWith: []},
};

export const NoToken: Story = {
  args: {live: null},
};

export const Loading: Story = {
  args: {live: {status: 'loading', reload: () => Promise.resolve(null)}},
};

export const ReadError: Story = {
  args: {
    live: {
      status: 'error',
      error: 'GitHub 404 on packages/synergy-engine/src/data/tuning.json: Not Found',
      reload: () => Promise.resolve(null),
    },
  },
};

// A reload failed after a read had landed: the editor and the tray stay, with the read's error above the tray (C1).
export const ReloadFailed: Story = {
  args: {
    live: {...READY, reloadError: 'GitHub 502 on packages/synergy-engine/src/data/tuning.json: Bad gateway'},
  },
};

export const RejectedToken: Story = {
  args: {
    live: {
      status: 'error',
      error: 'GitHub 401 on packages/synergy-engine/src/data/tuning.json: {"message":"Bad credentials"}',
      reload: () => Promise.resolve(null),
    },
  },
};
