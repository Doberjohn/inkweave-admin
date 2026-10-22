import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {SPACING} from '../../../app-bridge';
import {
  NUMBER_209_TO_BOTH,
  NUMBER_223_TO_BOTH,
  NUMBER_223_TO_BOTH_CLASHED,
  NUMBER_59_TO_FOIL,
  NUMBER_59_TO_FOIL_GONE,
  batchView,
} from '../finishes/__tests__/finishFixtures';
import {keptClash, type VersionChange} from '../finishes/versionBatch';
import {VersionsTray} from './VersionsTray';

/**
 * The tray is a row of its own across the studio's root, which is 1600px at most. These stories give
 * it a stage that wide, and a phone's line for the narrowest.
 */
const STAGE = 1200;
/** A phone: the root's 320px less the 64px rail and 32px of padding, which the tray then fills. */
const PHONE = 224;

const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc123';
const TWO_CHANGES = [NUMBER_59_TO_FOIL, NUMBER_223_TO_BOTH];

const meta: Meta<typeof VersionsTray> = {
  title: 'Admin/Publish/Card studio/Version changes tray',
  component: VersionsTray,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{maxWidth: STAGE, padding: SPACING.lg}}>
        <Story />
      </div>
    ),
  ],
  // The token is a stand-in: the story's Publish does nothing with it.
  args: {view: batchView(TWO_CHANGES), token: 'story', onForgetToken: () => {}},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Yen Sid's #59 made Foil only, which takes Normal away and says so, and his alt foil #223 made Both, which takes nothing away. */
export const TwoChanges: Story = {};

/** A publish found #223 changed on the branch: its row says what it shows there now and offers Keep mine or Drop, and Publish is held. */
export const Clash: Story = {args: {view: batchView([NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL])}};

/** The branch no longer has #59 where the app keeps it: there is nothing to keep, so its row offers Drop alone. */
export const Gone: Story = {args: {view: batchView([NUMBER_59_TO_FOIL_GONE, NUMBER_223_TO_BOTH])}};

/** A publish is under way: Publish reads Publishing…, and no change can be taken back, as the publish has them. */
export const Publishing: Story = {args: {view: batchView(TWO_CHANGES, {publishing: true})}};

/** The publish landed: the batch is empty, and the line says how many changes went and links the commit. */
export const Published: Story = {args: {view: batchView([], {result: {commitUrl: COMMIT_URL, count: 2}})}};

/** The branch moved while publishing: the tray says why in the store's words, with the changes still staged. */
export const PublishFailed: Story = {
  args: {
    view: batchView(TWO_CHANGES, {error: 'master changed while publishing, so nothing was published. Publish again.'}),
  },
};

/** GitHub rejected the token: the way out is Forget token, which leaves the changes as they are. */
export const TokenRejected: Story = {
  args: {
    view: batchView(TWO_CHANGES, {
      error: 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}',
    }),
  },
};

/** On a phone the tray fills the line, and each row's buttons wrap under its text. */
export const PhoneWidth: Story = {
  args: {view: batchView([NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL])},
  decorators: [
    (Story) => (
      <div style={{maxWidth: PHONE}}>
        <Story />
      </div>
    ),
  ],
};

/** The tray over a batch of its own, as the studio's store keeps one: Revert, Keep mine, Drop and Discard all work on it. */
function SettlingTray() {
  const [changes, setChanges] = useState<readonly VersionChange[]>([
    NUMBER_223_TO_BOTH_CLASHED,
    NUMBER_59_TO_FOIL_GONE,
    NUMBER_209_TO_BOTH,
  ]);
  const view = batchView(changes, {
    revert: (id) => setChanges((held) => held.filter((change) => change.id !== id)),
    keep: (id) => setChanges((held) => keptClash({changes: held}, id).changes),
    discard: () => setChanges([]),
  });
  return <VersionsTray view={view} token="story" onForgetToken={() => {}} />;
}

/** The tray live: keep or drop each clash and the line, and the hold on Publish, go with the last one; focus moves on as a button goes. */
export const Settling: Story = {render: () => <SettlingTray />};
