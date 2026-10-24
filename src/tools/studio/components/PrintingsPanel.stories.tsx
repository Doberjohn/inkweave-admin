import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {PROMO_SETS, SPACING} from '../../../app-bridge';
import {
  MKB_ROWS,
  NUMBER_223_TO_BOTH,
  NUMBER_223_TO_BOTH_CLASHED,
  URSULA_SET_3,
  YEN_SID_ROWS,
} from '../finishes/__tests__/finishFixtures';
import {printingRowsFor} from '../finishes/printingRows';
import type {BranchPrintings} from '../finishes/useBranchPrintings';
import {EMPTY_BATCH, changeFor, withChange, type VersionBatch} from '../finishes/versionBatch';
import {outcomeNote, promoSetOptions, type ScanState} from '../promos/printingForm';
import type {BaseCard, CatalogPrinting} from '../promos/promoCatalog';
import type {OpenPrintingForm, PrintingFormController} from '../promos/usePrintingForm';
import {
  FIXTURE_CATALOG,
  MKB_BASE,
  NO_OUTCOME,
  NO_SCAN,
  addForm,
  controllerOf,
  editFormOf,
  printingOf,
} from '../promos/__tests__/promoFixtures';
import {PrintingsPanel, type PromoPrintingsProps} from './PrintingsPanel';

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
  // In a router, as the studio renders it: a Core copy's note links to that card (#77).
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{maxWidth: WIDE_SLOT, padding: SPACING.lg}}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {view: {status: 'ready', rows: YEN_SID_ROWS}, changes: [], onChoose: () => {}},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Yen Sid - Powerful Sorcerer, a card of Set 4: #59 and the Enchanted follow their rarity, and the alt foil's data names Foil only. */
export const YenSid: Story = {};

/** The owner made the alt foil Both: its row shows the choice and "pending", and the other rows are as they were. */
export const PendingChange: Story = {args: {changes: [NUMBER_223_TO_BOTH]}};

/** A publish found the alt foil changed on the branch since the change was staged: it keeps the owner's choice, marked "clash". */
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

/** The panel live: each choice joins the batch, as the studio's does, and shows "pending" until the printing is back to what it showed. */
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

/**
 * On a phone the slot is the whole line, 224px here: the three choices still fit one line (176px
 * inside the panel, 172px needed). Only a slot under 220px wraps them two and one.
 */
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

/*
 * Promo printings (#77): Add a printing under the rows, an Edit on each promo row, and the form they
 * open. The form is PromoPrintingForm's, whose own stories show each of its states.
 */

/** Mother Knows Best's rows, with the branch's catalog, which holds its 1/C3 and 13/C3. */
const MKB_READY: BranchPrintings = {status: 'ready', rows: MKB_ROWS, catalog: FIXTURE_CATALOG};
/** A commit, as GitHub links one. */
const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/published';
const noop = () => {};

/** What the panel gets for Mother Knows Best's promos, with `controller`. */
function promosOf(controller: PrintingFormController): PromoPrintingsProps {
  return {controller, card: MKB_BASE, coreCopy: null, promoSets: promoSetOptions(PROMO_SETS), onForgetToken: noop};
}

/** A form as it opens: an add of `card`, or the edit of `printing`, filled in from the branch's catalog. */
function formOf({card, printing}: {card: BaseCard; printing: CatalogPrinting | null}): OpenPrintingForm {
  return printing === null ? addForm({card}) : editFormOf({printing, card});
}

/** The scan a chosen file makes, as the studio's upload would once the file is read. */
const scanOf = (file: File | null): ScanState =>
  file === null ? NO_SCAN : {name: file.name, dataUrl: URL.createObjectURL(file), error: null};

/**
 * A controller held in state, as the studio's is: Add a printing and Edit open their forms, entries
 * land, a chosen file shows, Cancel closes the form, and Publish lands at once (no commit is made), so
 * the line under the rows says so.
 */
function useStoryController(): PrintingFormController {
  const [form, setForm] = useState<OpenPrintingForm | null>(null);
  const [outcome, setOutcome] = useState(NO_OUTCOME);
  const open = (opened: OpenPrintingForm) => {
    setOutcome(NO_OUTCOME);
    setForm(opened);
  };
  const publish = () => {
    const scanSent = (form?.scan.dataUrl ?? null) !== null;
    setForm(null);
    setOutcome({result: {commitUrl: COMMIT_URL}, error: null, note: outcomeNote({scanSent, branch: 'master'})});
    return Promise.resolve(true);
  };
  return {
    ...controllerOf(form, {outcome}),
    openAdd: (card) => open(formOf({card, printing: null})),
    openEdit: (opened) => open(formOf(opened)),
    patch: (patch) => setForm((held) => held && {...held, values: {...held.values, ...patch}}),
    chooseScan: (file) => {
      setForm((held) => held && {...held, scan: scanOf(file)});
      return Promise.resolve();
    },
    cancel: () => setForm(null),
    publish,
  };
}

/** The panel on a controller held in state. */
function LivePromos() {
  const controller = useStoryController();
  return <PrintingsPanel view={MKB_READY} changes={[]} onChoose={noop} promos={promosOf(controller)} />;
}

/**
 * Mother Knows Best with Add a printing under its rows and an Edit on each promo. It is live: Add a
 * printing opens the add form in the button's place, and Edit opens the edit form under its row, the
 * focus on the form's heading; Cancel gives the focus back to the button. Publish lands at once here.
 */
export const AddAPrinting: Story = {render: () => <LivePromos />};

/** 13/C3's Edit pressed: its form opens under its row, filled in from the branch's catalog, and Add and every Edit hide meanwhile. */
export const EditOpen: Story = {
  args: {
    view: MKB_READY,
    promos: promosOf(controllerOf(formOf({card: MKB_BASE, printing: printingOf(80024)}))),
  },
};

/** Ursula's Set 3 copy's one row, #90, which no file names versions for. */
const URSULA_SET_3_ROWS = printingRowsFor({card: URSULA_SET_3, chunk: [URSULA_SET_3], promos: [], valueOf: () => null});

/**
 * Ursula - Deceiver of Set 3, whom Set 9 reprints: the catalog files her promos under the Set 9 card,
 * so her Set 3 copy offers no Add a printing and points to the Core printing instead.
 */
export const CoreCopy: Story = {
  args: {
    view: {status: 'ready', rows: URSULA_SET_3_ROWS, catalog: FIXTURE_CATALOG},
    promos: {...promosOf(controllerOf(null)), coreCopy: {id: '2026', name: 'Ursula - Deceiver (Set 9 #90)'}},
  },
};

/** A publish landed: the form closed, and the line under the rows links the commit and says when the printing shows. */
export const Landed: Story = {
  args: {
    view: MKB_READY,
    promos: promosOf(
      controllerOf(null, {
        outcome: {result: {commitUrl: COMMIT_URL}, error: null, note: outcomeNote({scanSent: true, branch: 'master'})},
      }),
    ),
  },
};
