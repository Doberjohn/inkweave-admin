import type {Meta, StoryObj} from '@storybook/react-vite';
import {SPACING} from '../../../app-bridge';
import {CURRENT_ART, PANEL_CARD, STAGED_ART} from '../studioFixtures';
import {StudioCardPanel} from './StudioCardPanel';

/** The handoff's card column: 400px when wide (README §7), 300px when narrow. */
const WIDE_COLUMN = 400;
const NARROW_COLUMN = 300;
const BAD_BYTES = 'mei.png holds a JPEG image; rename it to end in .jpg.';

/** Mei as she stands in Edit, and as the draft previews her once a new scan is staged. */
const CURRENT = {...PANEL_CARD, imageUrl: CURRENT_ART};
const STAGED_CARD = {...PANEL_CARD, imageUrl: STAGED_ART};

const meta: Meta<typeof StudioCardPanel> = {
  title: 'Admin/Publish/Card studio/Card panel',
  component: StudioCardPanel,
  tags: ['autodocs'],
  decorators: [
    (Story, {args}) => (
      <div style={{maxWidth: args.layout === 'narrow' ? NARROW_COLUMN : WIDE_COLUMN, padding: SPACING.lg}}>
        <Story />
      </div>
    ),
  ],
  args: {
    card: PANEL_CARD,
    mode: 'new',
    layout: 'wide',
    staged: {name: null, error: null},
    onImageChange: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

/** A fresh New reveal form: its card has no name and no art, so the frame shows the stripes and the pill. */
export const NewEmpty: Story = {args: {card: {...PANEL_CARD, name: '', fullName: '', version: undefined}}};

/** Named, with no scan yet: the app's own render of the card, in a dashed frame. */
export const NewNamed: Story = {};

/** A scan staged: a gold frame, "Click to change scan", Revert image and New reveal's own note. */
export const NewStaged: Story = {args: {card: STAGED_CARD, staged: {name: 'mei.png', error: null}}};

/** A file that failed its byte check: the error under the controls, which it describes, and no note. */
export const NewBadFile: Story = {args: {staged: {name: 'mei.png', error: BAD_BYTES}}};

/** A Japanese scan: what the app's "See translation" will show, under the caption. */
export const Translation: Story = {args: {card: {...STAGED_CARD, scanLanguage: 'ja'}, staged: {name: 'mei-ja.png', error: null}}};

/** Two inks: both icons in the caption, each named. */
export const DualInk: Story = {args: {card: {...PANEL_CARD, ink2: 'Sapphire'}}};

/** Edit, nothing staged: the card's art, "Click to replace image" and Replace card image. */
export const EditCurrent: Story = {args: {mode: 'edit', card: CURRENT, current: CURRENT}};

/** Edit, an image staged: the current art beside the note, and Revert image. */
export const EditStaged: Story = {
  args: {mode: 'edit', card: STAGED_CARD, current: CURRENT, staged: {name: 'mei-en.png', error: null}},
};

/** Edit, a file that failed its check: both file controls carry the error. */
export const EditBadFile: Story = {
  args: {mode: 'edit', card: CURRENT, current: CURRENT, staged: {name: 'mei-en.png', error: BAD_BYTES}},
};

/** The narrow layout's smaller preview (280px at most). */
export const Narrow: Story = {
  args: {layout: 'narrow', mode: 'edit', card: STAGED_CARD, current: CURRENT, staged: {name: 'mei-en.png', error: null}},
};
