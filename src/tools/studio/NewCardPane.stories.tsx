import type {Meta, StoryObj} from '@storybook/react-vite';
import {REVEAL_SET_CODE} from '../../app-bridge';
import type {FocusHandoff} from '../../shell/focusHandoff';
import {revealForm} from '../../test/revealForm';
import type {RevealAdminController} from '../reveal/useRevealAdmin';
import {validateRevealCardForm} from '../reveal/validateForm';
import {NewCardPane} from './NewCardPane';
import {revealController} from './studioFixtures';
import type {StudioLayout} from './studioLayout';
import {STUDIO_GRID} from './studioStyles';
import type {NewCardStepState} from './useNewCardStep';

/** No story takes a handoff: nothing here unmounts the control pressed. */
const NO_HANDOFF: FocusHandoff = {pending: false, request: () => {}, done: () => {}};

/**
 * Step 2, the reveal set chosen. Change set does nothing here: the step is
 * StudioWorkspace's state. Step 1 reads the card list's provider, so its
 * stories render it on its own (Set step).
 */
const REVEAL_CHOSEN: NewCardStepState = {
  set: REVEAL_SET_CODE,
  choose: () => {},
  change: () => {},
  editInstead: () => {},
  handoff: NO_HANDOFF,
};

interface NewCardStoryProps {
  layout: StudioLayout;
  ctrl: RevealAdminController;
}

/**
 * New card's step 2 in the studio's root, as StudioWorkspace lays it out under
 * the page header: the set bar over the reveal form's slots. The workspace has
 * no story of its own: its guard needs the data router, which a story doesn't
 * have.
 */
function NewCardStory({layout, ctrl}: NewCardStoryProps) {
  return (
    <div style={STUDIO_GRID[layout]}>
      <NewCardPane ctrl={ctrl} step={REVEAL_CHOSEN} layout={layout} handoff={NO_HANDOFF} onForgetToken={() => {}} />
    </div>
  );
}

const meta: Meta<typeof NewCardStory> = {
  title: 'Admin/Publish/Card studio/New card',
  component: NewCardStory,
  args: {layout: 'wide', ctrl: revealController()},
};
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * An empty draft, wide: the set bar, then the card panel, the form's four
 * sections two by two, and the aside. With no number typed, the bar names the
 * rule for the card's id.
 */
export const EmptyWide: Story = {};

/** The same draft narrow: the bar's parts stacked, the form first, as an accordion, then the card panel and the aside. */
export const EmptyNarrow: Story = {args: {layout: 'narrow'}};

const NUMBERED_FORM = revealForm();

/** A complete card: the bar names the id its collector number gives it, and the checklist waits only for the scan. */
export const Numbered: Story = {
  args: {
    ctrl: revealController({
      dirty: true,
      form: NUMBERED_FORM,
      validation: validateRevealCardForm(NUMBERED_FORM, new Set(), null),
    }),
  },
};

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

const LIST_FAILED_FORM = revealForm();

/**
 * A valid card while the card list has failed to load (R4-8f): Collector
 * number stays open, saying why, with "Load the card list again" under it,
 * and Identity's dot stays incomplete. The scan is still to come.
 */
export const CardListFailed: Story = {
  args: {
    ctrl: revealController({
      dirty: true,
      form: LIST_FAILED_FORM,
      validation: validateRevealCardForm(LIST_FAILED_FORM, new Set(), null),
      cardList: {isLoading: false, error: new Error('Failed to fetch local cards: 500')},
    }),
  },
};
