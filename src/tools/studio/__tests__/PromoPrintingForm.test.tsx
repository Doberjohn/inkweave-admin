import {useState} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PROMO_SETS} from '../../../app-bridge';
import {imageDataUrl, pngFile} from '../../../test/images';
import {PromoPrintingForm, type PromoPrintingFormProps} from '../components/PromoPrintingForm';
import {COMMIT_URL, notAFastForward, stubRepo} from '../finishes/__tests__/repoHarness';
import {
  EMPTY_PRINTING_FORM,
  editValuesOf,
  promoSetOptions,
  type PrintingFormValues,
  type ScanState,
} from '../promos/printingForm';
import {findPrinting, type BaseCard, type CatalogPrinting} from '../promos/promoCatalog';
import {usePrintingForm, type OpenPrintingForm, type PrintingFormController} from '../promos/usePrintingForm';
import {
  FIXTURE_CATALOG,
  FIXTURE_FILES,
  HIRO_BASE,
  MKB_BASE,
  PRINCE,
  addForm,
  controllerOf as makeController,
  editForm,
  editFormOf,
  printingOf,
} from '../promos/__tests__/promoFixtures';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** A scan that was read and passed its check. */
const PNG: ScanState = {name: 'scan.png', dataUrl: imageDataUrl('scan.png'), error: null};
/** A file chosen and still being read: named, with no bytes and no error yet. */
const READING: ScanState = {name: 'scan.png', dataUrl: null, error: null};
/** A file that failed its check: the upload keeps its name, drops its bytes and says why. */
const REFUSED: ScanState = {name: 'x.png', dataUrl: null, error: 'x.png is not a JPEG, PNG or WebP image.'};
/** The same failure with no name to go with it: the error alone holds Publish. */
const REFUSED_UNNAMED: ScanState = {...REFUSED, name: null};

/** Hiro Hamada's 24A/P2 (id 1661), which has Ravensburger's art. */
const HIRO_24A = {id: 1661, card: HIRO_BASE};
/** The art a printing row shows for a printing that has some. */
const ART = 'https://api.lorcana.ravensburger.com/images/en/promo2/24A_cc84f7fe9ea26d1ae15e97aa838b6f39b26c510b.jpg';
const FORMATS = 'JPEG, PNG or WebP.';
const RAVENSBURGER_LINE = "Its art is Ravensburger's, so it has no scan to replace.";
const REJECTED = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';

/** What the select offers: the app's promo sets, newest first. */
const PROMO_OPTIONS = promoSetOptions(PROMO_SETS);

/** 9/P4 for Foil only: all of an add the owner chooses before the scan. */
const NINE_P4: PrintingFormValues = {...EMPTY_PRINTING_FORM, promoGrouping: 'P4', number: '9', versions: 'foil'};

/** What an edit of printing `id` holds once the owner changed `changes`. */
const changed = (id: number, changes: Partial<PrintingFormValues>): PrintingFormValues => ({
  ...editValuesOf(printingOf(id)),
  ...changes,
});

/** A controller holding `form`, whose actions are spies. A publish lands, unless `rest` says otherwise. */
function controllerOf(form: OpenPrintingForm | null, rest: Partial<PrintingFormController> = {}): PrintingFormController {
  return makeController(form, {publish: vi.fn(() => Promise.resolve(true)), ...rest}, vi.fn);
}

/** What a test says of the form it renders: the form, and any props or controller state it changes. */
type Rendering = {form: OpenPrintingForm | null; publishing?: boolean} & Partial<Omit<PromoPrintingFormProps, 'controller'>>;

/** The form on a controller of spies, with the app's promo sets and nothing taken, unless the rendering says otherwise. */
function renderForm({form, publishing = false, ...props}: Rendering) {
  const controller = controllerOf(form, {publishing});
  const onForgetToken = props.onForgetToken ?? vi.fn();
  const rendered = render(<FormOf controller={controller} {...props} onForgetToken={onForgetToken} />);
  return {controller, onForgetToken, ...rendered};
}

/** The form with the app's promo sets and nothing taken, unless its props say otherwise. */
function FormOf(props: Partial<PromoPrintingFormProps> & Pick<PromoPrintingFormProps, 'controller'>) {
  return <PromoPrintingForm promoSets={PROMO_OPTIONS} taken={null} currentArt={undefined} onForgetToken={vi.fn()} {...props} />;
}

/** A drag of `files` from the desktop, as fireEvent hands it over: jsdom has no DataTransfer. */
const fileDrag = (...files: File[]) => ({types: ['Files'], files, dropEffect: 'none'});

/** The <label> a file control's name belongs to: drops land on it, round its hidden input. */
const labelOf = (control: string) => screen.getByLabelText(control).closest('label') as HTMLLabelElement;

/** The versions group of an add form. */
const versions = () => screen.getByRole('group', {name: 'Versions of the new printing'});

describe('PromoPrintingForm: what it asks for', () => {
  it('labels every field and holds Publish until the form is complete', () => {
    renderForm({form: addForm()});
    for (const label of ['Promo set', 'Number', 'Scan language', 'Note']) expect(screen.getByLabelText(label)).toBeInTheDocument();
    expect(versions()).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Publish'})).toBeDisabled();
    expect(screen.getByText('Choose a promo set to publish.')).toBeInTheDocument();
  });

  it('names Publish by the printing once it is complete', () => {
    renderForm({form: addForm({values: NINE_P4, scan: PNG})});
    expect(screen.getByRole('button', {name: 'Publish 9/P4'})).toBeEnabled();
    expect(screen.queryByText(/ to publish\.$/)).toBeNull();
  });

  it.each([
    ['a file named', REFUSED],
    ['an error alone', REFUSED_UNNAMED],
  ])("shows the scan's own error and holds Publish, for %s", (_case, scan) => {
    renderForm({form: addForm({values: NINE_P4, scan})});
    expect(screen.getByText('x.png is not a JPEG, PNG or WebP image.')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Publish 9/P4'})).toBeDisabled();
    expect(screen.getByLabelText('Click or drop to add the scan')).toBeInvalid();
  });

  it.each([
    ['an add', addForm({values: NINE_P4, scan: READING}), 'Publish 9/P4'],
    ['an edit with another change', editForm({values: changed(80049, {note: 'x'}), scan: READING}), 'Save 42/P2'],
  ])('holds Publish while the scan of %s is still being read', (_case, form, name) => {
    renderForm({form});
    expect(screen.getByRole('button', {name})).toBeDisabled();
  });

  it('says whose a taken code is, and holds Publish', () => {
    const taken = findPrinting(FIXTURE_CATALOG, 80024)!;
    renderForm({form: addForm({values: {...NINE_P4, promoGrouping: 'C3', number: '13'}, scan: PNG}), taken});
    expect(screen.getByText('13/C3 is taken: Mother Knows Best has it.')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Publish 13/C3'})).toBeDisabled();
  });

  it('names the art variant in the code an edit would take: 25A/P2, not 25/P2', () => {
    const taken = findPrinting(FIXTURE_CATALOG, 1662)!;
    renderForm({form: editForm({...HIRO_24A, values: changed(1661, {number: '25'})}), taken});
    expect(screen.getByText('25A/P2 is taken: Hiro Hamada - Armor Designer has it.')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Save as 25A/P2'})).toBeDisabled();
  });

  it('puts what is missing under the buttons, and ties it to Publish', () => {
    renderForm({form: addForm()});
    const publish = screen.getByRole('button', {name: 'Publish'});
    const line = screen.getByText('Choose a promo set to publish.');
    expect(publish.parentElement!.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(publish).toHaveAccessibleDescription('Choose a promo set to publish.');
  });
});

describe('PromoPrintingForm: its heading', () => {
  it.each([
    ['an add', addForm(), 'New printing of Mother Knows Best'],
    ['an edit', editForm(), 'Edit 42/P2 · id 80049'],
    ['an edit of a printing with an art variant', editForm(HIRO_24A), 'Edit 24A/P2 · id 1661'],
  ])('names %s', (_case, form, name) => {
    renderForm({form});
    expect(screen.getByRole('heading', {level: 3, name})).toBeInTheDocument();
    expect(screen.getByRole('region', {name})).toBeInTheDocument();
  });

  it("takes focus from script, and is no Tab stop: the scan control is the form's first", async () => {
    renderForm({form: addForm()});
    const heading = screen.getByRole('heading', {level: 3});
    expect(heading).toHaveAttribute('tabindex', '-1');
    heading.focus();
    expect(heading).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByLabelText('Click or drop to add the scan')).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByLabelText('Promo set')).toHaveFocus();
  });
});

describe('PromoPrintingForm: an edit', () => {
  it('words the note and the button as a save, offers no versions, and asks for a change first', () => {
    renderForm({form: editForm()});
    expect(screen.getByLabelText('Add a note')).toBeInTheDocument();
    expect(screen.queryByLabelText('Note')).toBeNull();
    expect(screen.queryByRole('group', {name: /^Versions/})).toBeNull();
    expect(screen.getByRole('button', {name: 'Save 42/P2'})).toBeDisabled();
    expect(screen.getByText('Change something to save.')).toBeInTheDocument();
  });

  it('saves the code the printing keeps, its art variant included', () => {
    renderForm({form: editForm(HIRO_24A)});
    expect(screen.getByRole('button', {name: 'Save 24A/P2'})).toBeDisabled();
  });

  it('names a move to another code', () => {
    renderForm({form: editForm({values: changed(80049, {number: '43'})})});
    expect(screen.getByRole('button', {name: 'Save as 43/P2'})).toBeEnabled();
  });

  it('asks for a promo set again once it is blanked', () => {
    renderForm({form: editForm({values: changed(80049, {promoGrouping: ''})})});
    expect(screen.getByText('Choose a promo set to save.')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Save'})).toBeDisabled();
  });
});

describe('PromoPrintingForm: the promo set', () => {
  /** The select's options as [value, text]. */
  const optionsOfSelect = () =>
    within(screen.getByLabelText('Promo set'))
      .getAllByRole('option')
      .map((option) => [(option as HTMLOptionElement).value, option.textContent]);

  it('offers a blank choice first, then the promo sets as given', () => {
    renderForm({form: addForm()});
    expect(optionsOfSelect()).toEqual([['', 'Choose a promo set'], ...PROMO_OPTIONS.map(({code, label}) => [code, label])]);
    expect(screen.getByLabelText('Promo set')).toHaveValue('');
  });

  it.each([
    ['an add', addForm()],
    ['an edit', editForm()],
  ])('says under the select of %s that a promo set it lacks needs the app first', (_case, form) => {
    renderForm({form});
    const hint = "A promo set not listed here has to be added to the app's PROMO_SETS first.";
    const select = screen.getByLabelText('Promo set');
    expect(select).toHaveAccessibleDescription(hint);
    expect(select.compareDocumentPosition(screen.getByText(hint)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the promo set an edit opened with, and adds no option for one the app lists', () => {
    renderForm({form: editForm()});
    expect(screen.getByLabelText('Promo set')).toHaveValue('P2');
    expect(optionsOfSelect()).toHaveLength(PROMO_OPTIONS.length + 1);
  });

  it("keeps the code of an edit the app doesn't list as an extra option, last, so it can be chosen again", () => {
    const odd: CatalogPrinting = {...printingOf(80017), promoGrouping: 'Q9'};
    renderForm({form: editFormOf({printing: odd, card: MKB_BASE, values: {...editValuesOf(odd), promoGrouping: 'P4'}})});
    expect(optionsOfSelect().at(-1)).toEqual(['Q9', 'Q9']);
    expect(optionsOfSelect()).toHaveLength(PROMO_OPTIONS.length + 2);
    expect(screen.getByLabelText('Promo set')).toHaveValue('P4');
  });
});

describe('PromoPrintingForm: entering', () => {
  it('hands each entry to the controller as a patch', async () => {
    const user = userEvent.setup();
    const {controller} = renderForm({form: addForm()});
    await user.selectOptions(screen.getByLabelText('Promo set'), 'P4');
    expect(controller.patch).toHaveBeenLastCalledWith({promoGrouping: 'P4'});
    await user.type(screen.getByLabelText('Number'), '9');
    expect(controller.patch).toHaveBeenLastCalledWith({number: '9'});
    await user.click(within(versions()).getByRole('button', {name: 'Foil only'}));
    expect(controller.patch).toHaveBeenLastCalledWith({versions: 'foil'});
    await user.selectOptions(screen.getByLabelText('Scan language'), 'ja');
    expect(controller.patch).toHaveBeenLastCalledWith({scanLanguage: 'ja'});
    await user.type(screen.getByLabelText('Note'), 'x');
    expect(controller.patch).toHaveBeenLastCalledWith({note: 'x'});
    expect(controller.patch).toHaveBeenCalledTimes(5);
  });

  it('prefixes its field ids, so they never meet the card form’s', () => {
    renderForm({form: addForm()});
    const ids = ['Promo set', 'Number', 'Scan language', 'Note'].map((label) => screen.getByLabelText(label).id);
    expect(ids).toEqual(['field-printing-promoSet', 'field-printing-number', 'field-printing-scanLanguage', 'field-printing-note']);
  });

  it('asks for the number on a numeric keypad', () => {
    renderForm({form: addForm()});
    expect(screen.getByLabelText('Number')).toHaveAttribute('inputmode', 'numeric');
  });

  it('shows the values the controller holds', () => {
    renderForm({form: addForm({values: {...NINE_P4, scanLanguage: 'de', note: 'from the box'}})});
    expect(screen.getByLabelText('Promo set')).toHaveValue('P4');
    expect(screen.getByLabelText('Number')).toHaveValue('9');
    expect(screen.getByLabelText('Scan language')).toHaveValue('de');
    expect(screen.getByLabelText('Note')).toHaveValue('from the box');
    expect(screen.getByLabelText('Note')).toHaveAttribute('placeholder', "Optional, for the catalog's notes");
  });

  it('offers the three versions, none pressed before one is chosen, then the one chosen', () => {
    const {rerender, controller} = renderForm({form: addForm()});
    const buttons = () => within(versions()).getAllByRole('button');
    const pressed = () => buttons().map((button) => button.getAttribute('aria-pressed'));
    expect(buttons().map((button) => button.textContent)).toEqual(['Both', 'Foil only', 'Normal only']);
    expect(pressed()).toEqual(['false', 'false', 'false']);
    rerender(<FormOf controller={{...controller, form: addForm({values: NINE_P4})}} />);
    expect(pressed()).toEqual(['false', 'true', 'false']);
  });

  it("keeps a scan language the list doesn't name", () => {
    renderForm({form: editForm()});
    const select = screen.getByLabelText('Scan language');
    expect(select).toHaveValue('zh');
    expect(within(select).getByRole('option', {name: 'Chinese'})).toBeInTheDocument();
  });

  it('keeps offering the language an edit opened with once another is chosen', () => {
    renderForm({form: editForm({values: changed(80049, {scanLanguage: 'ja'})})});
    const select = screen.getByLabelText('Scan language');
    expect(select).toHaveValue('ja');
    expect(within(select).getByRole('option', {name: 'Chinese'})).toBeInTheDocument();
  });
});

describe('PromoPrintingForm: the scan', () => {
  it('takes a dropped scan, the first of several', () => {
    const {controller} = renderForm({form: addForm()});
    const files = [pngFile('a.png'), pngFile('b.png')];
    fireEvent.drop(labelOf('Click or drop to add the scan'), {dataTransfer: fileDrag(...files)});
    expect(controller.chooseScan).toHaveBeenCalledExactlyOnceWith(files[0]);
  });

  it('takes a picked scan', async () => {
    const {controller} = renderForm({form: addForm()});
    const file = pngFile('a.png');
    await userEvent.upload(screen.getByLabelText('Click or drop to add the scan'), file);
    expect(controller.chooseScan).toHaveBeenCalledExactlyOnceWith(file);
  });

  it('names its control for an add and for an edit, and describes it by the formats', () => {
    const {unmount} = renderForm({form: addForm()});
    const input = screen.getByLabelText('Click or drop to add the scan');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    expect(input).toHaveAccessibleDescription(FORMATS);
    unmount();
    renderForm({form: editForm()});
    expect(screen.getByLabelText('Click or drop to replace the scan')).toHaveAccessibleDescription(FORMATS);
  });

  it('describes the control by its error first, once the file failed', () => {
    renderForm({form: addForm({scan: REFUSED})});
    expect(screen.getByLabelText('Click or drop to add the scan')).toHaveAccessibleDescription(`${REFUSED.error} ${FORMATS}`);
  });

  it('rings the control that has the focus, and the one a file is dragged over', () => {
    renderForm({form: addForm()});
    const label = labelOf('Click or drop to add the scan');
    expect(label).not.toHaveAttribute('data-focused');
    fireEvent.focus(screen.getByLabelText('Click or drop to add the scan'));
    expect(label).toHaveAttribute('data-focused', 'true');
    expect(label).not.toHaveAttribute('data-dragging');
    fireEvent.dragEnter(label, {dataTransfer: fileDrag()});
    expect(label).toHaveAttribute('data-dragging', 'true');
    fireEvent.drop(label, {dataTransfer: fileDrag(pngFile('a.png'))});
    expect(label).not.toHaveAttribute('data-dragging');
  });

  it('names the file chosen in a polite live region, beside the formats', () => {
    renderForm({form: addForm({scan: PNG})});
    expect(screen.getByText('scan.png').closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText(FORMATS)).toBeInTheDocument();
  });

  describe('its picture', () => {
    const picture = (container: HTMLElement) => container.querySelector('img')?.getAttribute('src') ?? null;

    it('is an empty box for an add until a scan is read, then the scan, and never an edit art', () => {
      const first = renderForm({form: addForm(), currentArt: ART});
      expect(picture(first.container)).toBeNull();
      first.unmount();
      const second = renderForm({form: addForm({scan: PNG})});
      expect(picture(second.container)).toBe(PNG.dataUrl);
    });

    it('is the current art of an edit until a scan is chosen, and then the scan', () => {
      const first = renderForm({form: editForm(), currentArt: ART});
      expect(picture(first.container)).toBe(ART);
      first.unmount();
      const second = renderForm({form: editForm({scan: PNG}), currentArt: ART});
      expect(picture(second.container)).toBe(PNG.dataUrl);
    });

    it('is decoration: the control and the heading name the printing', () => {
      const {container} = renderForm({form: editForm(), currentArt: ART});
      expect(container.querySelector('img')).toHaveAttribute('alt', '');
      expect(container.querySelector('img')?.closest('[aria-hidden="true"]')).not.toBeNull();
    });
  });

  describe('on a printing with Ravensburger art', () => {
    it('offers no scan to replace, and says why', () => {
      const {container} = renderForm({form: editForm(HIRO_24A), currentArt: ART});
      expect(container.querySelector('input[type="file"]')).toBeNull();
      expect(screen.queryByText(/Click or drop/)).toBeNull();
      expect(screen.queryByText(FORMATS)).toBeNull();
      expect(screen.getByText(RAVENSBURGER_LINE)).toBeInTheDocument();
    });

    it('shows its art', () => {
      const {container} = renderForm({form: editForm(HIRO_24A), currentArt: ART});
      expect(container.querySelector('img')).toHaveAttribute('src', ART);
    });

    it('can still save a note, since the scan is not its to change', () => {
      renderForm({form: editForm({...HIRO_24A, values: changed(1661, {note: 'a note'})})});
      expect(screen.getByRole('button', {name: 'Save 24A/P2'})).toBeEnabled();
    });
  });
});

describe('PromoPrintingForm: publishing and cancelling', () => {
  it('publishes and cancels through the controller', async () => {
    const user = userEvent.setup();
    const {controller} = renderForm({form: addForm({values: NINE_P4, scan: PNG})});
    await user.click(screen.getByRole('button', {name: 'Publish 9/P4'}));
    expect(controller.publish).toHaveBeenCalledOnce();
    expect(controller.cancel).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', {name: 'Cancel'}));
    expect(controller.cancel).toHaveBeenCalledOnce();
  });

  it('holds every field while it publishes', () => {
    renderForm({form: addForm({values: NINE_P4, scan: PNG}), publishing: true});
    expect(screen.getByLabelText('Number')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Note')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Promo set')).toBeDisabled();
    expect(screen.getByLabelText('Scan language')).toBeDisabled();
    for (const button of within(versions()).getAllByRole('button')) expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByLabelText('Click or drop to add the scan')).toBeDisabled();
    expect(labelOf('Click or drop to add the scan')).toHaveStyle({opacity: '0.4'});
  });

  it('reads Publishing…, holds Publish and keeps the form open: Cancel waits for the commit', () => {
    renderForm({form: addForm({values: NINE_P4, scan: PNG}), publishing: true});
    expect(screen.getByRole('button', {name: 'Publishing…'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Cancel'})).toBeDisabled();
  });

  it('takes no scan, dropped or picked, while it publishes', async () => {
    const {controller} = renderForm({form: addForm({values: NINE_P4, scan: PNG}), publishing: true});
    fireEvent.drop(labelOf('Click or drop to add the scan'), {dataTransfer: fileDrag(pngFile('b.png'))});
    await userEvent.upload(screen.getByLabelText('Click or drop to add the scan'), pngFile('c.png'));
    expect(controller.chooseScan).not.toHaveBeenCalled();
  });

  it('leaves the choices of a form that is not publishing open', () => {
    renderForm({form: addForm({values: NINE_P4, scan: PNG})});
    expect(screen.getByLabelText('Number')).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('Promo set')).toBeEnabled();
    for (const button of within(versions()).getAllByRole('button')) expect(button).not.toHaveAttribute('aria-disabled');
    expect(screen.getByRole('button', {name: 'Cancel'})).toBeEnabled();
  });
});

describe('PromoPrintingForm: a publish that failed', () => {
  it('shows the failure as an alert, with no way out but trying again', () => {
    const race = 'master changed while publishing, so nothing was published. Publish again.';
    renderForm({form: addForm({values: NINE_P4, scan: PNG, error: race})});
    expect(screen.getByRole('alert')).toHaveTextContent(race);
    expect(screen.queryByRole('button', {name: 'Forget token'})).toBeNull();
    expect(screen.getByRole('button', {name: 'Publish 9/P4'})).toBeEnabled();
  });

  it('offers Forget token when GitHub rejects the token', async () => {
    const {onForgetToken} = renderForm({form: addForm({values: NINE_P4, scan: PNG, error: REJECTED})});
    expect(screen.getByText(/GitHub rejected the saved token/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it('shows no alert before there is a failure', () => {
    renderForm({form: addForm()});
    expect(screen.queryByRole('alert')).toBeNull();
  });

  /** A form whose publish fails the way the controller reports it: the error comes with the false. */
  function FailingPublish() {
    const [error, setError] = useState<string | null>(null);
    const publish = () => {
      setError('GitHub 500 on /repos/Doberjohn/inkweave/git/commits: Server Error');
      return Promise.resolve(false);
    };
    return <FormOf controller={controllerOf(addForm({values: NINE_P4, scan: PNG, error}), {publish})} />;
  }

  it('hands focus to the failure of a publish that did not land (R-59): Publish went off while it ran', async () => {
    render(<FailingPublish />);
    // A browser drops the focus of a button that goes off to <body>; fireEvent leaves it there as well.
    fireEvent.click(screen.getByRole('button', {name: 'Publish 9/P4'}));
    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(alert.parentElement).toHaveFocus());
  });
});

/** Opens an add of `card` from a button, as the Printings panel does, and draws the form on the controller the studio holds. */
function OnTheStudiosController({card}: {card: BaseCard}) {
  const controller = usePrintingForm({token: 't', cardId: String(card.id)});
  return (
    <>
      <button type="button" onClick={() => controller.openAdd(card)}>
        Add a printing
      </button>
      <FormOf controller={controller} />
      {controller.outcome.result !== null && <p>Landed at {controller.outcome.result.commitUrl}</p>}
    </>
  );
}

/** Opens an add of Mickey Mouse - Brave Little Prince and fills in 9/P4 for Foil only, scan included, as far as Publish. */
async function fillInNineP4(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', {name: 'Add a printing'}));
  await user.selectOptions(screen.getByLabelText('Promo set'), 'P4');
  await user.type(screen.getByLabelText('Number'), '9');
  await user.click(within(versions()).getByRole('button', {name: 'Foil only'}));
  await user.upload(screen.getByLabelText('Click or drop to add the scan'), pngFile('scan.png'));
  const publish = screen.getByRole('button', {name: 'Publish 9/P4'});
  await waitFor(() => expect(publish).toBeEnabled());
  return publish;
}

describe('PromoPrintingForm: on the controller the studio holds', () => {
  it('asks for each thing in turn, then publishes the printing in one commit and closes', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    const user = userEvent.setup();
    render(<OnTheStudiosController card={PRINCE} />);
    expect(screen.queryByRole('heading', {level: 3})).toBeNull();

    await user.click(screen.getByRole('button', {name: 'Add a printing'}));
    expect(screen.getByRole('heading', {level: 3, name: 'New printing of Mickey Mouse - Brave Little Prince'})).toBeInTheDocument();
    expect(screen.getByText('Choose a promo set to publish.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Promo set'), 'P4');
    expect(screen.getByText('Enter a number from 1 up to publish.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Number'), '9');
    expect(screen.getByText('Choose its versions to publish.')).toBeInTheDocument();
    await user.click(within(versions()).getByRole('button', {name: 'Foil only'}));
    expect(screen.getByText('Add its scan to publish.')).toBeInTheDocument();
    await user.upload(screen.getByLabelText('Click or drop to add the scan'), pngFile('scan.png'));
    expect(await screen.findByText('scan.png')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', {name: 'Publish 9/P4'})).toBeEnabled());

    await user.click(screen.getByRole('button', {name: 'Publish 9/P4'}));
    expect(await screen.findByText(`Landed at ${COMMIT_URL}`)).toBeInTheDocument();
    expect(screen.queryByRole('heading', {level: 3})).toBeNull();
    expect(Object.keys(repo.filesSent())).toContain('apps/web/public/card-images-raw/80050.png');
  });

  it('holds the form while it publishes: no entry, no scan and no Cancel until the commit settles', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    const user = userEvent.setup();
    render(<OnTheStudiosController card={PRINCE} />);
    const publish = await fillInNineP4(user);
    const release = repo.fetch.getMockImplementation()!;
    let unblock: () => void = () => {};
    const blocked = new Promise<void>((resolve) => (unblock = resolve));
    repo.fetch.mockImplementation(async (...call) => {
      await blocked;
      return release(...call);
    });

    await user.click(publish);
    expect(await screen.findByRole('button', {name: 'Publishing…'})).toBeDisabled();
    expect(screen.getByLabelText('Number')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Promo set')).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Cancel'})).toBeDisabled();
    await user.type(screen.getByLabelText('Number'), '1');
    expect(screen.getByLabelText('Number')).toHaveValue('9');

    unblock();
    expect(await screen.findByText(`Landed at ${COMMIT_URL}`)).toBeInTheDocument();
  });

  it("keeps the form open on a commit the branch didn't take, says why, and hands focus to it", async () => {
    stubRepo({files: FIXTURE_FILES, update: () => notAFastForward()});
    const user = userEvent.setup();
    render(<OnTheStudiosController card={PRINCE} />);
    await fillInNineP4(user);

    // A browser leaves the focus on <body> once the button that had it goes off, and jsdom doesn't: the test lets go of it.
    (document.activeElement as HTMLElement).blur();
    fireEvent.click(screen.getByRole('button', {name: 'Publish 9/P4'}));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('master changed while publishing, so nothing was published. Publish again.');
    await waitFor(() => expect(alert.parentElement).toHaveFocus());
    // The form is live again, with what the owner entered.
    expect(screen.getByRole('button', {name: 'Publish 9/P4'})).toBeEnabled();
    expect(screen.getByLabelText('Number')).toHaveValue('9');
    expect(screen.getByLabelText('Number')).not.toHaveAttribute('readonly');
  });
});

describe('PromoPrintingForm: without a form', () => {
  it('draws nothing', () => {
    const {container} = renderForm({form: null});
    expect(container).toBeEmptyDOMElement();
  });
});
