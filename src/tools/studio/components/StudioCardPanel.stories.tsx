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

/** A fresh New card form: its card has no name and no art, so the frame shows the stripes and the pill. */
export const NewEmpty: Story = {args: {card: {...PANEL_CARD, name: '', fullName: '', version: undefined}}};

/** Named, with no scan yet: the app's own render of the card, in a dashed frame. */
export const NewNamed: Story = {};

/** A scan staged: a gold frame, "Click or drop to change scan", Revert image and New card's own note. */
export const NewStaged: Story = {args: {card: STAGED_CARD, staged: {name: 'mei.png', error: null}}};

/** A file that failed its byte check: the error under the controls, which it describes, and no note. */
export const NewBadFile: Story = {args: {staged: {name: 'mei.png', error: BAD_BYTES}}};

/** A Japanese scan: what the app's "See translation" will show, under the caption. */
export const Translation: Story = {args: {card: {...STAGED_CARD, scanLanguage: 'ja'}, staged: {name: 'mei-ja.png', error: null}}};

/** Two inks: both icons in the caption, each named. */
export const DualInk: Story = {args: {card: {...PANEL_CARD, ink2: 'Sapphire'}}};

/** Edit, nothing staged: the card's art, "Click or drop to replace image" and Replace card image. */
export const EditCurrent: Story = {args: {mode: 'edit', card: CURRENT, current: CURRENT}};

/**
 * Edit with no image control (#68), the panel Edit card draws for a card of Sets 1 to 8, whose art is
 * Ravensburger's: the art and the caption alone. As EditCurrent, but no pill over the preview, no
 * Replace card image, no formats hint and no drop target. The card is the other stories' own: the panel
 * shows no set, so it draws any card this way once `imageControl` is off.
 */
export const EditNoImageControl: Story = {args: {mode: 'edit', card: CURRENT, current: CURRENT, imageControl: false}};

/**
 * Holds a scan from the desktop over the file control `selector` names, as a
 * drag that hasn't dropped: it shows the drop target (data-dragging). The held
 * drag never leaves, so the target stays lit until a drag ends: a file dropped
 * anywhere, or a drag cancelled. A play function builds a real DataTransfer,
 * which the browser's DragEvent needs.
 */
function holdScanOver(selector: string) {
  return ({canvasElement}: {canvasElement: HTMLElement}) => {
    const data = new DataTransfer();
    data.items.add(new File([''], 'mei-en.png', {type: 'image/png'}));
    canvasElement.querySelector(selector)?.dispatchEvent(new DragEvent('dragenter', {bubbles: true, dataTransfer: data}));
  };
}

/** Edit, a scan dragged over the preview: the cover rings as the drop target, as it does with focus (Doberjohn/inkweave-admin#54). */
export const EditDropOnPreview: Story = {
  args: {mode: 'edit', card: CURRENT, current: CURRENT},
  play: holdScanOver('.adm-file-cover'),
};

/** Edit, a scan dragged over Replace card image: it rings as the drop target, and the cover doesn't. */
export const EditDropOnReplace: Story = {
  args: {mode: 'edit', card: CURRENT, current: CURRENT},
  play: holdScanOver('.adm-file-btn'),
};

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
