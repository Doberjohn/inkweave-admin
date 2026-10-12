import type {Meta, StoryObj} from '@storybook/react-vite';
import type {FocusHandoff} from '../../shell/focusHandoff';
import type {RevealAdminController} from '../reveal/useRevealAdmin';
import {NewRevealPane} from './NewRevealPane';
import {revealController} from './studioFixtures';
import type {StudioLayout} from './studioLayout';
import {STUDIO_GRID} from './studioStyles';

/** No story takes a handoff: nothing here unmounts the control pressed. */
const NO_HANDOFF: FocusHandoff = {pending: false, request: () => {}, done: () => {}};

interface NewRevealStoryProps {
  layout: StudioLayout;
  ctrl: RevealAdminController;
}

/**
 * New reveal in the studio's root, as StudioWorkspace lays it out under the
 * page header. The workspace has no story of its own: its guard needs the data
 * router, which a story doesn't have.
 */
function NewRevealStory({layout, ctrl}: NewRevealStoryProps) {
  return (
    <div style={STUDIO_GRID[layout]}>
      <NewRevealPane ctrl={ctrl} layout={layout} handoff={NO_HANDOFF} onForgetToken={() => {}} />
    </div>
  );
}

const meta: Meta<typeof NewRevealStory> = {
  title: 'Admin/Publish/Card studio/New reveal',
  component: NewRevealStory,
  args: {layout: 'wide', ctrl: revealController()},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** An empty draft, wide: the card panel, the form's four sections two by two, and the aside. */
export const EmptyWide: Story = {};

/** The same draft narrow: the form first, as an accordion, then the card panel and the aside. */
export const EmptyNarrow: Story = {args: {layout: 'narrow'}};

/** Just published: the outcome, with the deploy note and the commit link, over an empty form again. */
export const Published: Story = {
  args: {ctrl: revealController({result: {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/abc123'}})},
};

/** GitHub rejected the token: the failure, with Forget token (R-26). */
export const RejectedToken: Story = {
  args: {
    ctrl: revealController({
      dirty: true,
      commitError: 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}',
    }),
  },
};
