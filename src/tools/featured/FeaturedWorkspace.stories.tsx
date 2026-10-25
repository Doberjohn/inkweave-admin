import type {Meta, StoryObj} from '@storybook/react-vite';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {DUAL, FEATURED_CARDS, GOLIATH, NO_ART, SIX, cardByIdIn, entriesFor} from './featuredFixtures';
import {StaleFeaturedError} from './githubClient';
import {featuredProblem, slotsOf} from './featuredSlots';
import type {FeaturedEditor, FeaturedSave} from './useFeaturedEditor';
import type {UseDeployedFeaturedResult} from './useDeployedFeatured';
import {FeaturedView} from './FeaturedWorkspace';

const noop = () => {};
const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/5e1f0a2c9d';

/** The page's state for six cards with `picks` staged over them, as useFeaturedEditor builds it. */
function editorOf({six = SIX, picks = [], save = {status: 'idle'}}: {six?: readonly LorcanaCard[]; picks?: [number, LorcanaCard][]; save?: FeaturedSave}): FeaturedEditor {
  const entries = entriesFor(six);
  const saved = slotsOf(entries, cardByIdIn());
  const staged = new Map(picks);
  const slots = saved.map((slot, i) => {
    const card = staged.get(i);
    return card ? {...slotsOf(entriesFor([card]), cardByIdIn())[0], ink: slot.ink} : slot;
  });
  const blocked = staged.size === 0 ? 'Pick a card to change first.' : featuredProblem(slots);
  return {
    read: {status: 'ready', entries},
    slots,
    saved,
    picks: staged,
    blocked: save.status === 'saving' ? 'Saving…' : blocked,
    save,
    stage: noop,
    undo: noop,
    discard: noop,
    onSave: noop,
    reload: () => Promise.resolve(true),
  };
}

const live = (ids: readonly string[]): UseDeployedFeaturedResult => ({status: 'ready', ids: [...ids], check: noop});
const LIVE_SIX = live(SIX.map((card) => card.id));
const LIST = {cards: FEATURED_CARDS, isLoading: false, error: null, retryLoad: noop};

const meta: Meta<typeof FeaturedView> = {
  title: 'Admin/Publish/Featured cards',
  component: FeaturedView,
  args: {editor: editorOf({}), deployed: LIVE_SIX, list: LIST, onReload: noop, onForgetToken: noop},
  // PageLayout fills AdminShell's column and scrolls its own body, so the story gives it the view's height.
  decorators: [
    (Story) => (
      <div style={{height: '100vh'}}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** The homepage's six as the branch's file lists them, which inkweave.ink serves. */
export const Loaded: Story = {};

/** Goliath staged in Amethyst's place: "New", what the slot held, Undo, and Save on. */
export const StagedPick: Story = {args: {editor: editorOf({picks: [[1, GOLIATH]]})}};

/** Christopher Robin staged in two slots: Save stays off, and the second slot says why. */
export const RepeatedCard: Story = {args: {editor: editorOf({picks: [[1, DUAL], [4, DUAL]]})}};

/** A file edited by hand to leave Amber with no card: Save stays off, in the app's words. */
export const MissingInk: Story = {args: {editor: editorOf({six: [GOLIATH, ...SIX.slice(1)], picks: [[4, DUAL]]})}};

/** A file edited by hand to name a card with no art in Amethyst: the slot says why, and Save stays off. */
export const NoArt: Story = {args: {editor: editorOf({six: [SIX[0], NO_ART, ...SIX.slice(2)], picks: [[4, DUAL]]})}};

/** A file naming a card inkweave.ink's card list lacks (one not deployed yet): the slot shows the file's line, and Save stays off. */
export const NotInCardList: Story = {
  args: {editor: editorOf({six: [SIX[0], {...GOLIATH, id: '9999', fullName: 'Goliath - Clan Leader'}, ...SIX.slice(2)], picks: [[4, DUAL]]})},
};

/** Someone saved from another tab first: the refusal, and Reload. */
export const StaleRefusal: Story = {
  args: {editor: editorOf({picks: [[1, GOLIATH]], save: {status: 'failed', error: new StaleFeaturedError('master').message, kind: 'stale'}})},
};

/** Just saved: the commit, and inkweave.ink still showing the previous six until the deploy finishes. */
export const Saved: Story = {
  args: {editor: editorOf({six: [SIX[0], GOLIATH, ...SIX.slice(2)], save: {status: 'saved', commitUrl: COMMIT_URL}}), deployed: LIVE_SIX},
};

/** The file read, the card list still loading. */
export const CardListLoading: Story = {args: {list: {...LIST, isLoading: true}}};
