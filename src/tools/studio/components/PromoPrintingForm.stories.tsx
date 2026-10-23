import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState, type ReactNode} from 'react';
import {PROMO_SETS, SPACING} from '../../../app-bridge';
import {useFileDropGuard} from '../../../components/useFileDrop';
import {imageDataUrl} from '../../../test/images';
import {Panel} from '../../../ui/Panel';
import {EMPTY_PRINTING_FORM, editValuesOf, promoSetOptions, type PrintingFormValues, type ScanState} from '../promos/printingForm';
import {findPrinting, type BaseCard} from '../promos/promoCatalog';
import type {OpenPrintingForm, PrintingFormController} from '../promos/usePrintingForm';
import {FIXTURE_CATALOG, MKB_BASE, SNOW_WHITE_BASE} from '../promos/__tests__/promoFixtures';
import {CURRENT_ART} from '../studioFixtures';
import {PromoPrintingForm, type PromoPrintingFormProps} from './PromoPrintingForm';

/**
 * The form slot the Printings panel sits in: 624px at the narrowest wide layout (the studio's two middle
 * columns), and at most 400px when narrow. On a phone the slot is the whole line, 224px here.
 */
const WIDE_SLOT = 624;
const NARROW_SLOT = 400;
const PHONE_SLOT = 224;

const NO_SCAN: ScanState = {name: null, dataUrl: null, error: null};
/** A scan that was read and checked. Its bytes are only a PNG's signature, so its preview is a broken image: AddEmpty takes a real file. */
const SCAN: ScanState = {name: 'scan.png', dataUrl: imageDataUrl('scan.png'), error: null};
/** 9/P4 for Foil only, all of an add the owner chooses before the scan. */
const NINE_P4: PrintingFormValues = {...EMPTY_PRINTING_FORM, promoGrouping: 'P4', number: '9', versions: 'foil'};
/** Hiro Hamada - Armor Designer, whose 24A/P2 has Ravensburger's art. */
const HIRO: BaseCard = {id: 1529, fullName: 'Hiro Hamada - Armor Designer', setCode: '7', number: 96, core: false};

const noop = () => {};

/** What the branch says to a publish of 13/C3, which Mother Knows Best has. */
const TAKEN_ON_MASTER = '13/C3 is taken on master: Mother Knows Best has it.';

/** The printing of FIXTURE_CATALOG with this id. */
const printing = (id: number) => findPrinting(FIXTURE_CATALOG, id)!.printing;

/** Mother Knows Best's add form, as it opens unless `rest` changes it. */
function addForm(rest: Partial<OpenPrintingForm> = {}): OpenPrintingForm {
  const opened = EMPTY_PRINTING_FORM;
  return {kind: 'add', card: MKB_BASE, printing: null, values: opened, initial: opened, scan: NO_SCAN, error: null, ...rest};
}

/** The edit form of a printing of FIXTURE_CATALOG, as it opens. */
function editForm({id, card}: {id: number; card: BaseCard}): OpenPrintingForm {
  const values = editValuesOf(printing(id));
  return {kind: 'edit', card, printing: printing(id), values, initial: values, scan: NO_SCAN, error: null};
}

/** A controller holding `form`, whose actions do nothing: a story shows one state of the form. */
function controllerOf(form: OpenPrintingForm | null, rest: Partial<PrintingFormController> = {}): PrintingFormController {
  return {
    form,
    dirty: false,
    publishing: false,
    outcome: {result: null, error: null, note: ''},
    openAdd: noop,
    openEdit: noop,
    patch: noop,
    chooseScan: () => Promise.resolve(),
    cancel: noop,
    publish: () => Promise.resolve(false),
    ...rest,
  };
}

/**
 * The form where the studio puts it, in the Printings panel. A file dropped beside a control would open in
 * the tab, as it would on the page: the studio mounts the guard, so the story does.
 */
function InPanel({children}: {children: ReactNode}) {
  useFileDropGuard();
  return <Panel title="Printings">{children}</Panel>;
}

const meta: Meta<typeof PromoPrintingForm> = {
  title: 'Admin/Publish/Card studio/Promo printing form',
  component: PromoPrintingForm,
  tags: ['autodocs'],
  // The slot's width is the story's parameters.slot, 624px unless it says another.
  decorators: [
    (Story, {parameters}) => (
      <div style={{padding: SPACING.lg}}>
        <div style={{maxWidth: parameters.slot ?? WIDE_SLOT}}>
          <InPanel>
            <Story />
          </InPanel>
        </div>
      </div>
    ),
  ],
  args: {
    controller: controllerOf(addForm()),
    promoSets: promoSetOptions(PROMO_SETS),
    taken: null,
    currentArt: undefined,
    onForgetToken: noop,
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A form held in state, as the studio's controller holds it: entries land, a chosen file shows, and Cancel puts
 * the form back as it opened. Publish does nothing.
 */
function useLiveController(first: OpenPrintingForm): PrintingFormController {
  const [form, setForm] = useState<OpenPrintingForm>(first);
  const scanOf = (file: File | null): ScanState =>
    file === null ? NO_SCAN : {name: file.name, dataUrl: URL.createObjectURL(file), error: null};
  return controllerOf(form, {
    patch: (patch) => setForm((held) => ({...held, values: {...held.values, ...patch}})),
    chooseScan: (file) => {
      setForm((held) => ({...held, scan: scanOf(file)}));
      return Promise.resolve();
    },
    cancel: () => setForm(first),
  });
}

// The story's args hold a controller too, a still one: the live controller comes last, so it is the one the form gets.
function LiveForm({first, ...props}: PromoPrintingFormProps & {first: OpenPrintingForm}) {
  const controller = useLiveController(first);
  return <PromoPrintingForm {...props} controller={controller} />;
}

/** A new printing of Mother Knows Best, as it opens: Publish is off and says what is missing. It is live: enter, choose or drop a scan. */
export const AddEmpty: Story = {render: (args) => <LiveForm {...args} first={addForm()} />};

/** All an add needs: 9/P4, Foil only and a scan. Publish names the printing and is on. */
export const AddComplete: Story = {args: {controller: controllerOf(addForm({values: NINE_P4, scan: SCAN}))}};

/** Snow White's 42/P2, whose scan is in Chinese, which the list does not name: the select keeps it. Save is off until something changes. */
export const EditChineseScan: Story = {
  args: {controller: controllerOf(editForm({id: 80049, card: SNOW_WHITE_BASE})), currentArt: CURRENT_ART},
};

/** Hiro Hamada's 24A/P2, whose art is Ravensburger's: the form shows it, with no scan to replace, and can still save a note. */
export const EditRavensburgerArt: Story = {
  args: {controller: controllerOf(editForm({id: 1661, card: HIRO})), currentArt: printing(1661).images?.thumbnail},
};

/** A publish under way: every field is held, the scan control takes no file, and Publish and Cancel are off. */
export const Publishing: Story = {args: {controller: controllerOf(addForm({values: NINE_P4, scan: SCAN}), {publishing: true})}};

/** A publish the branch refused: 13/C3 is Mother Knows Best's already. The branch is read again, so the form says so as well. */
export const RefusedTakenCode: Story = {
  args: {
    controller: controllerOf(addForm({values: {...NINE_P4, promoGrouping: 'C3', number: '13'}, scan: SCAN, error: TAKEN_ON_MASTER})),
    taken: findPrinting(FIXTURE_CATALOG, 80024),
  },
};

/** In a narrow layout the slot is 400px at most, so the box is under 360px and the fields wrap under the scan. */
export const NarrowSlot: Story = {
  args: {controller: controllerOf(addForm({values: NINE_P4, scan: SCAN}))},
  parameters: {slot: NARROW_SLOT},
};

/** On a phone the slot is the whole line, 224px here: the scan, then the fields under it. */
export const PhoneSlot: Story = {
  args: {controller: controllerOf(addForm({values: NINE_P4, scan: SCAN}))},
  parameters: {slot: PHONE_SLOT},
};
