import type {Meta, StoryObj} from '@storybook/react-vite';
import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import type {PendingEdit} from '../useTuningAdmin';
import {PendingTray} from './PendingTray';

function edit(p: Partial<PendingEdit>): PendingEdit {
  const path = p.path ?? ['ruleTexts', 'shift-targets', 'curve.gap3', 'score'];
  return {
    pathKey: JSON.stringify(path),
    path,
    value: 6,
    oldValue: 5,
    label: 'Shift Targets · curve.gap3 · score',
    valid: true,
    ...p,
  };
}

const pending: PendingEdit[] = [
  edit({}),
  edit({
    path: ['playstyles', 'ramp', 'name'],
    label: 'Ramp · Title · text',
    oldValue: 'Ramp',
    value: 'Ramp!',
  }),
];

const meta: Meta<typeof PendingTray> = {
  title: 'TuningAdmin/PendingTray',
  component: PendingTray,
  args: {
    pending,
    publishDisabled: false,
    publishing: false,
    result: null,
    error: null,
    onRevert: () => {},
    onClear: () => {},
    onPublish: () => {},
  },
  decorators: [
    (Story) => (
      // The tuning aside's foot, where the tray is pinned (R2-5).
      <div style={{width: 380, padding: SPACING.xxl, background: ADMIN_COLORS.aside}}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof PendingTray>;

export const WithEdits: Story = {};

export const Empty: Story = {
  args: {pending: [], publishDisabled: true},
};

export const Invalid: Story = {
  args: {
    pending: [edit({valid: false, error: 'Score must be between 1 and 10', value: '11'})],
    publishDisabled: true,
  },
};

export const LongDiff: Story = {
  args: {
    pending: [
      edit({
        path: ['playstyles', 'ramp', 'tagline'],
        label: 'Ramp · Tagline · text',
        oldValue: 'Speed up your ink so you can play powerful cards earlier than your opponent.',
        value: 'Speed up your ink so you can play powerful cards earlier than your opponent, then keep the pressure on.',
      }),
    ],
  },
};

export const Publishing: Story = {
  args: {publishing: true, publishDisabled: true},
};

export const Published: Story = {
  args: {pending: [], result: {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/abc123'}},
};

export const WithError: Story = {
  args: {error: 'Publish failed: 403 Forbidden'},
};

export const StaleValue: Story = {
  args: {
    error:
      'playstyles.ramp.name changed since the editor loaded it (now "Ramp 2"). Reload tuning.json and make the edit again.',
    onReload: () => {},
  },
};

export const RejectedToken: Story = {
  args: {
    error: 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}',
    onForgetToken: () => {},
  },
};
