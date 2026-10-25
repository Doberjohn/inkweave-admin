import type {Meta, StoryObj} from '@storybook/react-vite';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {REVEAL_ID_BASE, REVEAL_SET_CODE, SET_TOTAL} from '../../../app-bridge';
import type {FocusHandoff} from '../../../shell/focusHandoff';
import {newCardSets} from '../newCardSets';
import {studioCard} from '../studioFixtures';
import type {StudioLayout} from '../studioLayout';
import {STUDIO_GRID} from '../studioStyles';
import {SetStep, type SetStepProps} from './SetStep';

/** No story takes a handoff: nothing here unmounts the control pressed. */
const NO_HANDOFF: FocusHandoff = {pending: false, request: () => {}, done: () => {}};

/** A card of the reveal set at number `n`: released under an official id, or a preview under REVEAL_ID_BASE + n. */
function revealCard(n: number, kind: 'released' | 'preview' = 'released'): LorcanaCard {
  const id = kind === 'released' ? String(3000 + n) : String(REVEAL_ID_BASE + n);
  return studioCard({id, name: `Card ${n}`, setCode: REVEAL_SET_CODE, setNumber: n});
}

/** One card of each released Core set, 9 to 13, as the card list holds them. */
const RELEASED = ['9', '10', '11', '12', '13'].map((setCode) =>
  studioCard({id: `${setCode}01`, name: `Card ${setCode}`, setCode, setNumber: 1}),
);
const NUMBERS = Array.from({length: SET_TOTAL}, (_, i) => i + 1);

type SetStepStoryProps = Pick<SetStepProps, 'sets' | 'listError'> & {layout: StudioLayout};

/** The step in the studio's root, as New card shows it under the page header: a row of its own. */
function SetStepStory({layout, ...choice}: SetStepStoryProps) {
  return (
    <div style={STUDIO_GRID[layout]}>
      <SetStep
        {...choice}
        onRetryList={() => {}}
        onChoose={() => {}}
        onEditInstead={() => {}}
        handoff={NO_HANDOFF}
      />
    </div>
  );
}

const meta: Meta<typeof SetStepStory> = {
  title: 'Admin/Publish/Card studio/New card set step',
  component: SetStepStory,
  args: {
    layout: 'wide',
    // Early in a season: a dozen numbers in, most of them previews.
    sets: newCardSets([
      ...NUMBERS.slice(0, 12).map((n) => revealCard(n, n <= 3 ? 'released' : 'preview')),
      ...RELEASED,
    ]),
    listError: null,
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

/** In season: the reveal set's tile, the one set that takes a new card, over the released sets. */
export const InSeason: Story = {};

/** The same, narrow. */
export const InSeasonNarrow: Story = {args: {layout: 'narrow'}};

/** After graduation: no set takes a card, so the step says why and offers Edit card; the reveal set heads the released sets. */
export const Graduated: Story = {
  args: {sets: newCardSets([...NUMBERS.map((n) => revealCard(n)), ...RELEASED])},
};

/** Every number in, one still a preview: no set takes a card, and the reveal set stays out of the released sets. */
export const Full: Story = {
  args: {sets: newCardSets([...NUMBERS.map((n) => revealCard(n, n === 1 ? 'preview' : 'released')), ...RELEASED])},
};

/** The card list still loading: no set yet, and no control. */
export const Loading: Story = {args: {sets: null}};

/** The card list failed: its error and Retry in the sets' place. */
export const ListFailed: Story = {
  args: {sets: null, listError: new Error('Failed to fetch local cards: 500')},
};
