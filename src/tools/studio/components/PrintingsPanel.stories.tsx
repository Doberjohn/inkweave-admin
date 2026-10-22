import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {SPACING} from '../../../app-bridge';
import {
  MKB_ROWS,
  NUMBER_223_TO_BOTH,
  NUMBER_223_TO_BOTH_CLASHED,
  YEN_SID_ROWS,
} from '../finishes/__tests__/finishFixtures';
import {EMPTY_BATCH, changeFor, withChange, type VersionBatch} from '../finishes/versionBatch';
import {PrintingsPanel} from './PrintingsPanel';

/**
 * The form slot the panel sits in: 624px at the narrowest wide layout (the studio's two middle
 * columns), and at most 400px when narrow, where the choices wrap under each name.
 */
const WIDE_SLOT = 624;
const NARROW_SLOT = 400;
/** A phone: the root's 320px less the 64px rail and 32px of padding, which the slot then fills. */
const PHONE_SLOT = 224;

const meta: Meta<typeof PrintingsPanel> = {
  title: 'Admin/Publish/Card studio/Printings panel',
  component: PrintingsPanel,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{maxWidth: WIDE_SLOT, padding: SPACING.lg}}>
        <Story />
      </div>
    ),
  ],
  args: {view: {status: 'ready', rows: YEN_SID_ROWS}, changes: [], onChoose: () => {}},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Yen Sid - Powerful Sorcerer, a card of Set 4: #59 and the Enchanted follow their rarity, and the alt foil's data names Foil only. */
export const YenSid: Story = {};

/** The owner made the alt foil Both: its row shows the choice and "Pending", and the other rows are as they were. */
export const PendingChange: Story = {args: {changes: [NUMBER_223_TO_BOTH]}};

/** A publish found the alt foil changed on the branch since the change was staged: it keeps the owner's choice, marked "Clash". */
export const Clash: Story = {args: {changes: [NUMBER_223_TO_BOTH_CLASHED]}};

/** A card of a Core set with two Challenge Set 3 promos: Normal only and Foil only, named by their promo codes. */
export const Promos: Story = {args: {view: {status: 'ready', rows: MKB_ROWS}}};

/** Staging in a batch of its own: choose a version, and choose the one the printing showed to take it back. */
function ChoosingPanel() {
  const [batch, setBatch] = useState<VersionBatch>(EMPTY_BATCH);
  return (
    <PrintingsPanel
      view={{status: 'ready', rows: YEN_SID_ROWS}}
      changes={batch.changes}
      onChoose={(chosen) => setBatch((held) => withChange(held, changeFor(chosen)))}
    />
  );
}

/** The panel live: each choice joins the batch, as the studio's does, and shows "Pending" until the printing is back to what it showed. */
export const Choosing: Story = {render: () => <ChoosingPanel />};

/** The branch's files are being read. The heading stays, so the panel does not jump when the rows come. */
export const Loading: Story = {args: {view: {status: 'loading'}}};

/** The files could not be read: the error as GitHub words it, and a way to read them again. */
export const ReadFailed: Story = {
  args: {
    view: {
      status: 'error',
      error: 'GitHub 404 on apps/web/public/data/collection/4.json: Not Found',
      retry: () => {},
    },
  },
};

/** In a narrow layout the form slot is 400px at most, so each row's choices wrap under its name. */
export const NarrowSlot: Story = {
  args: {changes: [NUMBER_223_TO_BOTH]},
  decorators: [
    (Story) => (
      <div style={{maxWidth: NARROW_SLOT}}>
        <Story />
      </div>
    ),
  ],
};

/** On a phone the slot is the whole line, and the choices wrap two and one. */
export const PhoneSlot: Story = {
  args: {changes: [NUMBER_223_TO_BOTH]},
  decorators: [
    (Story) => (
      <div style={{maxWidth: PHONE_SLOT}}>
        <Story />
      </div>
    ),
  ],
};
