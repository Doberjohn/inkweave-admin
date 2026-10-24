import {createRef, useImperativeHandle, useState, type ReactElement, type Ref} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {COLORS, PROMO_SETS} from '../../../app-bridge';
import {pngFile} from '../../../test/images';
import {PrintingsPanel, type PrintingsPanelProps, type PromoPrintingsProps} from '../components/PrintingsPanel';
import {
  MKB_ROWS,
  NUMBER_223_TO_BOTH,
  NUMBER_223_TO_BOTH_CLASHED,
  NUMBER_59_TO_FOIL,
  YEN_SID_ROWS,
} from '../finishes/__tests__/finishFixtures';
import {COMMIT_URL, stubRepo} from '../finishes/__tests__/repoHarness';
import type {PrintingRow} from '../finishes/printingRows';
import type {BranchPrintings} from '../finishes/useBranchPrintings';
import {changeFor} from '../finishes/versionBatch';
import {EMPTY_PRINTING_FORM, editValuesOf, promoSetOptions} from '../promos/printingForm';
import type {PromoCatalog} from '../promos/promoCatalog';
import {usePrintingForm, type OpenPrintingForm, type PrintingFormController} from '../promos/usePrintingForm';
import {
  FIXTURE_CATALOG,
  FIXTURE_FILES,
  MKB_BASE,
  addForm,
  controllerOf as makeController,
  editForm,
  filesFor,
  printingOf,
} from '../promos/__tests__/promoFixtures';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Yen Sid's #59 (Both, by rarity), his Enchanted #209 (Foil, by rarity) and his alt foil #223 (Foil, in the data). */
const [NUMBER_59, ENCHANTED_209, ALT_FOIL_223] = YEN_SID_ROWS;

const READY: BranchPrintings = {status: 'ready', rows: YEN_SID_ROWS};
const LOADING: BranchPrintings = {status: 'loading'};
const FAILED = 'GitHub 404 on apps/web/public/data/collection/4.json: Not Found';

/** `ui` in a router, as the studio renders the panel: a Core copy's note links to that card (#77). */
const routed = (ui: ReactElement) => <MemoryRouter>{ui}</MemoryRouter>;

/**
 * The panel on Yen Sid's rows with nothing staged, unless the test says otherwise. `onChoose` records
 * what it is told, and `update` renders the panel again with some props changed, as the page does
 * when the files land or the batch changes: the props it leaves out stay as they were.
 */
function renderPanel(first: Partial<PrintingsPanelProps> = {}) {
  const onChoose = vi.fn();
  let props: PrintingsPanelProps = {view: READY, changes: [], onChoose, ...first};
  const rendered = render(routed(<PrintingsPanel {...props} />));
  const update = (next: Partial<PrintingsPanelProps>) => {
    props = {...props, ...next};
    rendered.rerender(routed(<PrintingsPanel {...props} />));
  };
  return {onChoose, update, user: userEvent.setup()};
}

/** What a test does to the panel `renderReading` renders. */
interface Reading {
  /** The files land, or fail: the view is what the hook would hand the panel next. */
  land: (view: BranchPrintings) => void;
}

/**
 * The panel as the page runs it: its view is state, and "Read the files again" puts the view back to
 * loading in the press itself, as the hook's retry does, so the press and the loading are one render.
 * Given `promos`, it runs the printing form too.
 */
function ReadingPanel({first, promos, ref}: {first: BranchPrintings; promos?: PromoPrintingsProps; ref: Ref<Reading>}) {
  const [view, setView] = useState(first);
  useImperativeHandle(ref, () => ({land: setView}), []);
  const retry = () => setView(LOADING);
  return <PrintingsPanel view={view.status === 'error' ? {...view, retry} : view} changes={[]} onChoose={vi.fn()} promos={promos} />;
}

function renderReading(first: BranchPrintings, promos?: PromoPrintingsProps) {
  const reading = createRef<Reading>();
  render(<ReadingPanel first={first} promos={promos} ref={reading} />);
  return {user: userEvent.setup(), land: (view: BranchPrintings) => act(() => reading.current?.land(view))};
}

/** The group of version buttons of a row. */
const versionsOf = (row: PrintingRow) => screen.getByRole('group', {name: `Versions of ${row.label}`});

/** The labels of the version buttons that are pressed in a row's group: one, when the row reads right. */
const pressedIn = (row: PrintingRow) =>
  within(versionsOf(row))
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.textContent);

/** The list item that holds a row, found by the name it shows. */
const itemOf = (row: PrintingRow) => screen.getByText(row.name).closest('li') as HTMLElement;

describe('PrintingsPanel', () => {
  it("shows Yen Sid's printings with their versions and where each comes from", () => {
    renderPanel();
    const group = screen.getByRole('group', {name: 'Versions of Yen Sid - Powerful Sorcerer #223 · Set 4'});
    expect(within(group).getByRole('button', {name: 'Foil only'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('by rarity')).toHaveLength(2);
    expect(screen.getByText('in the data')).toBeInTheDocument();
  });

  it('is a region named Printings, with one row for each printing in the order it was given', () => {
    renderPanel();
    const panel = screen.getByRole('region', {name: 'Printings'});
    expect(within(panel).getByRole('heading', {level: 2, name: 'Printings'})).toBeInTheDocument();
    const items = within(panel).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    ['#59', '#209 · Enchanted', '#223 · Alt foil'].forEach((name, index) => {
      expect(within(items[index]).getByText(name)).toBeInTheDocument();
      // Each row offers the three choices, in the panel's order.
      expect(within(items[index]).getAllByRole('button').map((button) => button.textContent)).toEqual([
        'Both',
        'Foil only',
        'Normal only',
      ]);
    });
  });

  it('presses the version each row shows, whether its data names one or its rarity gives it', () => {
    renderPanel();
    expect(pressedIn(NUMBER_59)).toEqual(['Both']);
    expect(pressedIn(ENCHANTED_209)).toEqual(['Foil only']);
    expect(pressedIn(ALT_FOIL_223)).toEqual(['Foil only']);
    // One marker for each row, by where its versions come from.
    expect(within(itemOf(NUMBER_59)).getByText('by rarity')).toBeInTheDocument();
    expect(within(itemOf(ENCHANTED_209)).getByText('by rarity')).toBeInTheDocument();
    expect(within(itemOf(ALT_FOIL_223)).getByText('in the data')).toBeInTheDocument();
  });

  it("draws each printing's art as decoration, 28px wide, and an empty box for one with none", () => {
    renderPanel({view: {status: 'ready', rows: [NUMBER_59, {...ENCHANTED_209, thumbnail: undefined}]}});
    const images = document.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('alt', '');
    expect(images[0]).toHaveAttribute('width', '28');
    expect(images[0]).toHaveAttribute('src', NUMBER_59.thumbnail);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(within(itemOf({...ENCHANTED_209, thumbnail: undefined})).queryByRole('img')).not.toBeInTheDocument();
  });

  it('stages a choice and shows it pending once the batch holds it', async () => {
    const {user, onChoose, update} = renderPanel();
    await user.click(within(versionsOf(ALT_FOIL_223)).getByRole('button', {name: 'Both'}));
    expect(onChoose).toHaveBeenCalledExactlyOnceWith({row: ALT_FOIL_223, choice: 'both'});
    // The panel stages nothing itself: the row shows what the batch holds.
    expect(pressedIn(ALT_FOIL_223)).toEqual(['Foil only']);

    update({changes: [NUMBER_223_TO_BOTH]});
    expect(pressedIn(ALT_FOIL_223)).toEqual(['Both']);
    const row = itemOf(ALT_FOIL_223);
    expect(within(row).getByText('pending')).toBeInTheDocument();
    // It is the row's one marker: it no longer says where the old versions came from.
    expect(within(row).queryByText('in the data')).not.toBeInTheDocument();
    // The other rows are as they were.
    expect(pressedIn(NUMBER_59)).toEqual(['Both']);
    expect(screen.getAllByText('pending')).toHaveLength(1);
  });

  it('shows each pending row with the versions its change writes', () => {
    renderPanel({changes: [NUMBER_59_TO_FOIL, NUMBER_223_TO_BOTH]});
    expect(pressedIn(NUMBER_59)).toEqual(['Foil only']);
    expect(pressedIn(ALT_FOIL_223)).toEqual(['Both']);
    expect(pressedIn(ENCHANTED_209)).toEqual(['Foil only']);
    expect(screen.getAllByText('pending')).toHaveLength(2);
    expect(within(itemOf(ENCHANTED_209)).getByText('by rarity')).toBeInTheDocument();
  });

  it('reports each choice of a row as the choice, not the label', async () => {
    const {user, onChoose} = renderPanel();
    await user.click(within(versionsOf(NUMBER_59)).getByRole('button', {name: 'Normal only'}));
    await user.click(within(versionsOf(ENCHANTED_209)).getByRole('button', {name: 'Both'}));
    expect(onChoose.mock.calls).toEqual([
      [{row: NUMBER_59, choice: 'normal'}],
      [{row: ENCHANTED_209, choice: 'both'}],
    ]);
  });

  it('marks a clash, in place of pending, and shows the versions the owner chose', () => {
    renderPanel({changes: [NUMBER_223_TO_BOTH_CLASHED]});
    const row = itemOf(ALT_FOIL_223);
    expect(within(row).getByText('clash')).toBeInTheDocument();
    expect(within(row).queryByText('pending')).not.toBeInTheDocument();
    expect(pressedIn(ALT_FOIL_223)).toEqual(['Both']);
  });

  it('says it is loading the printings, under its heading', () => {
    renderPanel({view: LOADING});
    expect(within(screen.getByRole('region', {name: 'Printings'})).getByText('Loading the printings…')).toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers a retry when the files did not load', async () => {
    const retry = vi.fn();
    const {user} = renderPanel({view: {status: 'error', error: FAILED, retry}});
    expect(screen.getByRole('alert')).toHaveTextContent(FAILED);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Read the files again'}));
    expect(retry).toHaveBeenCalledOnce();
  });
});

/*
 * A publish has the changes it sent, so while it runs every choice is held: a click stages nothing,
 * and the choice keeps the focus it has. Once it lands or clashes, the branch's files are read
 * again; meanwhile the rows the panel had stay, held, and the list says it is busy, so the panel
 * neither jumps nor drops the focus (R-48).
 */
describe('PrintingsPanel: during a publish, and while the files are read again after one', () => {
  const REFRESHING: BranchPrintings = {status: 'ready', rows: YEN_SID_ROWS, refreshing: true};
  const FAILED_AGAIN: BranchPrintings = {status: 'error', error: FAILED, retry: () => {}};
  /** Yen Sid's rows once a publish made #223 Both. */
  const PUBLISHED: BranchPrintings = {
    status: 'ready',
    rows: YEN_SID_ROWS.map((row) => (row === ALT_FOIL_223 ? {...row, value: ['normal', 'foil'], shown: ['normal', 'foil']} : row)),
  };
  const bothOf = (row: PrintingRow) => within(versionsOf(row)).getByRole('button', {name: 'Both'});

  it('holds every choice while a publish runs: a click stages nothing, and the choice keeps the focus', async () => {
    const {user, onChoose} = renderPanel({publishing: true});
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(9);
    for (const button of buttons) expect(button).toHaveAttribute('aria-disabled', 'true');

    await user.click(bothOf(ALT_FOIL_223));
    expect(onChoose).not.toHaveBeenCalled();
    expect(bothOf(ALT_FOIL_223)).toHaveFocus();
    // Its rows are what the branch holds: the list isn't busy.
    expect(screen.getByRole('list')).not.toHaveAttribute('aria-busy');
  });

  it('keeps its rows, held and busy, while the files are read again, and is live once they land', async () => {
    const {user, onChoose, update} = renderPanel({view: REFRESHING});
    const list = screen.getByRole('list');
    expect(list).toHaveAttribute('aria-busy', 'true');
    for (const button of screen.getAllByRole('button')) expect(button).toHaveAttribute('aria-disabled', 'true');
    await user.click(bothOf(ALT_FOIL_223));
    expect(onChoose).not.toHaveBeenCalled();

    update({view: PUBLISHED});
    expect(screen.getByRole('list')).toBe(list);
    expect(list).not.toHaveAttribute('aria-busy');
    for (const button of screen.getAllByRole('button')) expect(button).not.toHaveAttribute('aria-disabled');
    expect(pressedIn(ALT_FOIL_223)).toEqual(['Both']);
    await user.click(within(versionsOf(ALT_FOIL_223)).getByRole('button', {name: 'Foil only'}));
    expect(onChoose).toHaveBeenCalledOnce();
  });

  it('keeps the same rows, and the focus on a choice, from the publish through the read after it', () => {
    const {update} = renderPanel({publishing: true});
    const list = screen.getByRole('list');
    const both = bothOf(NUMBER_59);
    both.focus();

    update({publishing: false, view: REFRESHING});
    update({view: PUBLISHED});
    expect(screen.queryByText('Loading the printings…')).not.toBeInTheDocument();
    expect(screen.getByRole('list')).toBe(list);
    expect(bothOf(NUMBER_59)).toBe(both);
    expect(both).toHaveFocus();
  });

  /*
   * The rows the panel keeps while the files are read again are the last read's, from before the publish. A row
   * the publish wrote shows what it wrote until the read lands, marked as the branch's data now names it (#74).
   */
  it("shows a published change's versions on its row while the branch is read again", () => {
    // Mother Knows Best's 1/C3, which the branch named Normal only, and its #99, which follows its rarity.
    const [mkb99, mkb1C3] = MKB_ROWS;
    const {update} = renderPanel({
      view: {status: 'ready', rows: MKB_ROWS, refreshing: true},
      published: [changeFor({row: mkb1C3, choice: 'foil'})],
    });
    expect(pressedIn(mkb1C3)).toEqual(['Foil only']);
    expect(within(itemOf(mkb1C3)).getByText('in the data')).toBeInTheDocument();
    expect(screen.queryByText('pending')).not.toBeInTheDocument();
    // A row the publish didn't write is as the last read has it.
    expect(pressedIn(mkb99)).toEqual(['Both']);
    expect(within(itemOf(mkb99)).getByText('by rarity')).toBeInTheDocument();

    // The read lands, and the branch's data names Foil only for 1/C3: the row is unchanged.
    const read = MKB_ROWS.map((row): PrintingRow => (row === mkb1C3 ? {...row, value: ['foil'], shown: ['foil']} : row));
    update({view: {status: 'ready', rows: read}});
    expect(pressedIn(mkb1C3)).toEqual(['Foil only']);
    expect(within(itemOf(mkb1C3)).getByText('in the data')).toBeInTheDocument();
  });

  it("shows the branch's values once the read lands, whatever the publish wrote", () => {
    // #59 follows its rarity, Both, and a publish made it Foil only: until the read lands, the data names its versions.
    const {update} = renderPanel({view: REFRESHING, published: [NUMBER_59_TO_FOIL]});
    expect(pressedIn(NUMBER_59)).toEqual(['Foil only']);
    expect(within(itemOf(NUMBER_59)).getByText('in the data')).toBeInTheDocument();

    // The read lands, and the branch's data names nothing for #59 (someone took it out since): the row says so.
    update({view: READY});
    expect(pressedIn(NUMBER_59)).toEqual(['Both']);
    expect(within(itemOf(NUMBER_59)).getByText('by rarity')).toBeInTheDocument();
  });

  it('shows a change staged since in front of what the publish wrote', () => {
    // Another tab staged #59 as Normal only while the publish that made it Foil only ran. The change stays in the
    // batch, started from what the publish wrote (afterPublish).
    const wrote = NUMBER_59_TO_FOIL.to;
    const restaged = {...changeFor({row: NUMBER_59, choice: 'normal'}), from: wrote, shownFrom: wrote};
    renderPanel({view: REFRESHING, changes: [restaged], published: [NUMBER_59_TO_FOIL]});
    expect(pressedIn(NUMBER_59)).toEqual(['Normal only']);
    expect(within(itemOf(NUMBER_59)).getByText('pending')).toBeInTheDocument();
  });

  it('hands the focus on a choice to "Read the files again" when the read after a publish fails (R-48)', () => {
    const {update} = renderPanel({view: REFRESHING});
    bothOf(ALT_FOIL_223).focus();

    update({view: FAILED_AGAIN});
    expect(screen.getByRole('alert')).toHaveTextContent(FAILED);
    expect(screen.getByRole('button', {name: 'Read the files again'})).toHaveFocus();
  });

  it('moves no focus when that read fails with the focus outside its rows', () => {
    const {update} = renderPanel({view: REFRESHING});
    const elsewhere = document.body.appendChild(document.createElement('input'));
    elsewhere.focus();

    update({view: FAILED_AGAIN});
    expect(elsewhere).toHaveFocus();
    elsewhere.remove();
  });

  it('moves no focus when that read fails and nothing had the focus', () => {
    const {update} = renderPanel({view: REFRESHING});
    expect(document.body).toHaveFocus();

    update({view: FAILED_AGAIN});
    expect(document.body).toHaveFocus();
  });
});

/*
 * Reading the files again takes the error and its button away the moment it starts, so focus would
 * drop to <body> (R-48). The panel outlives that swap, so it holds the handoff: the heading takes
 * it once the files are in, and a read that fails again hands it to the new button.
 */
describe('PrintingsPanel: reading the files again (R-48)', () => {
  const failed: BranchPrintings = {status: 'error', error: FAILED, retry: () => {}};
  const failedAgain: BranchPrintings = {...failed, error: 'GitHub 502 on apps/web/public/data/collection/4.json: Bad Gateway'};
  const readAgain = () => screen.getByRole('button', {name: 'Read the files again'});

  it('hands focus to the heading once the files are in', async () => {
    const {user, land} = renderReading(failed);
    await user.click(readAgain());
    // The button went with the error, and nothing has the focus until the files land.
    expect(screen.getByText('Loading the printings…')).toBeInTheDocument();
    expect(document.body).toHaveFocus();

    land(READY);
    expect(screen.getByRole('heading', {name: 'Printings'})).toHaveFocus();
  });

  it('hands focus to the new button when the files fail again, and asks for no more after it', async () => {
    const {user, land} = renderReading(failed);
    await user.click(readAgain());
    land(failedAgain);
    expect(screen.getByRole('alert')).toHaveTextContent('Bad Gateway');
    expect(readAgain()).toHaveFocus();

    // The request was taken: a later read that lands moves focus nowhere.
    readAgain().blur();
    land(READY);
    expect(document.body).toHaveFocus();
  });

  it('leaves focus where the owner moved it while the files were read', async () => {
    const {user, land} = renderReading(failed);
    await user.click(readAgain());
    const elsewhere = document.body.appendChild(document.createElement('input'));
    elsewhere.focus();

    land(READY);
    expect(elsewhere).toHaveFocus();
    elsewhere.remove();
  });

  it('asks for focus on that press alone: neither a first load nor a choice moves it', async () => {
    const {user, update} = renderPanel({view: LOADING});
    update({view: READY});
    expect(document.body).toHaveFocus();

    const both = within(versionsOf(ALT_FOIL_223)).getByRole('button', {name: 'Both'});
    await user.click(both);
    update({changes: [NUMBER_223_TO_BOTH]});
    expect(both).toHaveFocus();
  });
});

/*
 * Adding and editing a card's promo printings from the panel (#77). The form is PromoPrintingForm's
 * (its own tests), and its controller the studio's (usePrintingForm): here, where the panel puts the
 * form, when it offers one, what it tells the form, and where the focus goes as forms open and close.
 */

/** Mother Knows Best's #99, 1/C3 (80017) and 13/C3 (80024), with the branch's catalog. */
const [MKB_99, MKB_1_C3, MKB_13_C3] = MKB_ROWS;
const MKB_READY: BranchPrintings = {status: 'ready', rows: MKB_ROWS, catalog: FIXTURE_CATALOG};
const PROMO_OPTIONS = promoSetOptions(PROMO_SETS);
/** A row's art, where a test needs one: Mother Knows Best's promos have none of their own in the fixtures. */
const ART = 'https://api.lorcana.ravensburger.com/images/en/challenge3/13_art.jpg';
const LANDED_NOTE = 'Its art shows on inkweave.ink once the app has converted the scan and deployed.';
const GONE = '13/C3 is no longer on master.';
const REJECTED = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';

/** The catalog once someone took 13/C3 out of it by hand: Mother Knows Best keeps 1/C3 alone. */
const WITHOUT_13_C3: PromoCatalog = {
  ...FIXTURE_CATALOG,
  fold: [{...FIXTURE_CATALOG.fold[0], variants: FIXTURE_CATALOG.fold[0].variants.slice(0, 1)}],
};

/** A controller holding `form`, whose actions are spies. */
function controllerOf(form: OpenPrintingForm | null, rest: Partial<PrintingFormController> = {}): PrintingFormController {
  return makeController(form, rest, vi.fn);
}

/** What the panel gets for Mother Knows Best's promos: no form open and nothing said, unless `rest` says otherwise. */
function promosProps(rest: Partial<PromoPrintingsProps> = {}): PromoPrintingsProps {
  return {controller: controllerOf(null), card: MKB_BASE, coreCopy: null, promoSets: PROMO_OPTIONS, onForgetToken: vi.fn(), ...rest};
}

/** The Edit buttons, by the names they read to a screen reader. */
const editNames = () => screen.queryAllByRole('button', {name: /^Edit /}).map((button) => button.getAttribute('aria-label'));
const addButton = () => screen.queryByRole('button', {name: 'Add a printing'});
/** Whether `later` comes after `earlier` in the page. */
const follows = (earlier: Element, later: Element) => Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('PrintingsPanel: promo printings (#77)', () => {
  it('offers Add a printing under the rows, and Edit on promo rows only', () => {
    renderPanel({view: MKB_READY, promos: promosProps()});
    expect(addButton()).toBeInTheDocument();
    expect(follows(screen.getByRole('list'), addButton()!)).toBe(true);
    expect(editNames()).toEqual(['Edit Mother Knows Best 1/C3', 'Edit Mother Knows Best 13/C3']);
    // Each Edit reads "Edit" and sits in its own row, after the row's marker; the card's own row has none.
    const edit = within(itemOf(MKB_13_C3)).getByRole('button', {name: 'Edit Mother Knows Best 13/C3'});
    expect(edit).toHaveTextContent(/^Edit$/);
    expect(follows(within(itemOf(MKB_13_C3)).getByText('in the data'), edit)).toBe(true);
    expect(within(itemOf(MKB_99)).queryByRole('button', {name: /^Edit/})).toBeNull();
  });

  it.each([
    ['without the form', {view: MKB_READY}],
    ["before the branch's catalog is read", {view: {status: 'ready', rows: MKB_ROWS}, promos: promosProps()}],
  ] satisfies Array<[string, Partial<PrintingsPanelProps>]>)('offers no Add a printing and no Edit %s', (_case, props) => {
    renderPanel(props);
    expect(addButton()).toBeNull();
    expect(editNames()).toEqual([]);
  });

  it("keeps the rows live over a catalog the form can't read, and says why in place of Add a printing and every Edit (#84)", async () => {
    const problem = `scripts/data/promo-printings.json can't be read: its "noBaseCard" isn't a list`;
    const {onChoose, user} = renderPanel({view: {status: 'ready', rows: MKB_ROWS, catalogError: problem}, promos: promosProps()});
    expect(addButton()).toBeNull();
    expect(editNames()).toEqual([]);
    const notice = screen.getByRole('alert');
    expect(notice).toHaveTextContent(`Promo printings can't be added or edited: ${problem}.`);
    expect(follows(screen.getByRole('list'), notice)).toBe(true);
    // The line for the last publish stays under it.
    expect(follows(notice, document.querySelector('[data-outcome]')!)).toBe(true);

    await user.click(within(versionsOf(MKB_13_C3)).getByRole('button', {name: 'Both'}));
    expect(onChoose).toHaveBeenCalledWith({row: MKB_13_C3, choice: 'both'});
  });

  it('offers no Edit on a promo the catalog does not hold', () => {
    renderPanel({view: {...MKB_READY, catalog: WITHOUT_13_C3}, promos: promosProps()});
    expect(editNames()).toEqual(['Edit Mother Knows Best 1/C3']);
  });

  it("offers Edit by a row's kind: never on a card or a set printing, whatever ids the catalog holds", () => {
    // A catalog whose entries have the ids of Yen Sid's #59, Enchanted and alt foil: they are still no promos.
    const promo = FIXTURE_CATALOG.fold[0].variants[0];
    const lookalikes: PromoCatalog = {
      ...FIXTURE_CATALOG,
      fold: [{...FIXTURE_CATALOG.fold[0], variants: YEN_SID_ROWS.map((row) => ({...promo, id: Number(row.ref.id)}))}],
    };
    renderPanel({view: {status: 'ready', rows: YEN_SID_ROWS, catalog: lookalikes}, promos: promosProps()});
    expect(addButton()).toBeInTheDocument();
    expect(editNames()).toEqual([]);
  });

  it('opens an add of the card, and an edit of the printing the catalog holds for the row', async () => {
    const controller = controllerOf(null);
    const {user} = renderPanel({view: MKB_READY, promos: promosProps({controller})});
    await user.click(addButton()!);
    expect(controller.openAdd).toHaveBeenCalledExactlyOnceWith(MKB_BASE);
    await user.click(screen.getByRole('button', {name: 'Edit Mother Knows Best 13/C3'}));
    expect(controller.openEdit).toHaveBeenCalledExactlyOnceWith({card: MKB_BASE, printing: printingOf(80024)});
  });

  it('holds Add a printing and every Edit while the files are read again after a publish, as it holds the choices', async () => {
    const controller = controllerOf(null);
    const {user, update} = renderPanel({view: {...MKB_READY, refreshing: true}, promos: promosProps({controller})});
    // The catalog is the last read's until the read lands: an Edit opened on it would open the entry as it was.
    const held = [addButton()!, ...screen.getAllByRole('button', {name: /^Edit /})];
    expect(held).toHaveLength(3);
    for (const button of held) {
      expect(button).toHaveAttribute('aria-disabled', 'true');
      await user.click(button);
    }
    expect(controller.openAdd).not.toHaveBeenCalled();
    expect(controller.openEdit).not.toHaveBeenCalled();
    // A held button keeps the focus its press gave it.
    expect(held[2]).toHaveFocus();

    update({view: MKB_READY});
    for (const button of held) expect(button).not.toHaveAttribute('aria-disabled');
    expect(held[2]).toHaveFocus();
    await user.click(held[2]);
    expect(controller.openEdit).toHaveBeenCalledExactlyOnceWith({card: MKB_BASE, printing: printingOf(80024)});
  });

  it('keeps a held Edit its resting colour on hover', () => {
    const {update} = renderPanel({view: {...MKB_READY, refreshing: true}, promos: promosProps()});
    const edit = screen.getByRole('button', {name: 'Edit Mother Knows Best 13/C3'});
    fireEvent.mouseEnter(edit);
    expect(edit).toHaveStyle({color: COLORS.primary});
    // Once the read lands the Edit is live, and the pointer still on it brightens it.
    update({view: MKB_READY});
    expect(edit).toHaveStyle({color: COLORS.primaryHover});
  });

  it('opens the edit form under its row, and hides Add and Edit meanwhile', () => {
    const rows = [MKB_99, MKB_1_C3, {...MKB_13_C3, thumbnail: ART}];
    renderPanel({view: {...MKB_READY, rows}, promos: promosProps({controller: controllerOf(editForm({id: 80024, card: MKB_BASE}))})});
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(within(items[2]).getByText('13/C3')).toBeInTheDocument();
    expect(within(items[3]).getByRole('region', {name: 'Edit 13/C3 · id 80024'})).toBeInTheDocument();
    // The form shows the row's art.
    expect(items[3].querySelector('img')).toHaveAttribute('src', ART);
    expect(addButton()).toBeNull();
    expect(editNames()).toEqual([]);
  });

  it('opens the add form under the rows, in place of Add a printing, and hides every Edit meanwhile', () => {
    renderPanel({view: MKB_READY, promos: promosProps({controller: controllerOf(addForm())})});
    const form = screen.getByRole('region', {name: 'New printing of Mother Knows Best'});
    expect(follows(screen.getByRole('list'), form)).toBe(true);
    expect(within(screen.getByRole('list')).queryByRole('region')).toBeNull();
    expect(addButton()).toBeNull();
    expect(editNames()).toEqual([]);
    // The form offers the promo sets it was given.
    expect(within(screen.getByLabelText('Promo set')).getAllByRole('option')).toHaveLength(PROMO_OPTIONS.length + 1);
  });

  it('tells the form who has the code it names, from the branch’s catalog', () => {
    const scan = {name: 'scan.png', dataUrl: 'data:image/png;base64,iVBORw0KGgo=', error: null};
    const values = {...EMPTY_PRINTING_FORM, promoGrouping: 'C3', number: '13', versions: 'foil' as const};
    const {update} = renderPanel({view: MKB_READY, promos: promosProps({controller: controllerOf(addForm({values, scan}))})});
    expect(screen.getByRole('button', {name: 'Publish 13/C3'})).toHaveAccessibleDescription('13/C3 is taken: Mother Knows Best has it.');
    expect(screen.getByRole('button', {name: 'Publish 13/C3'})).toBeDisabled();

    update({promos: promosProps({controller: controllerOf(addForm({values: {...values, promoGrouping: 'P4', number: '9'}, scan}))})});
    expect(screen.queryByText(/is taken/)).toBeNull();
    expect(screen.getByRole('button', {name: 'Publish 9/P4'})).toBeEnabled();
  });

  it('holds an edit that moves its printing onto another’s code, never one that keeps its own', () => {
    const moved = editForm({id: 80017, card: MKB_BASE, values: {...editValuesOf(printingOf(80017)), number: '13'}});
    const {update} = renderPanel({view: MKB_READY, promos: promosProps({controller: controllerOf(moved)})});
    expect(screen.getByRole('button', {name: 'Save as 13/C3'})).toHaveAccessibleDescription('13/C3 is taken: Mother Knows Best has it.');

    const noted = editForm({id: 80024, card: MKB_BASE, values: {...editValuesOf(printingOf(80024)), note: 'Foil twin of 1/C3.'}});
    update({promos: promosProps({controller: controllerOf(noted)})});
    expect(screen.queryByText(/is taken/)).toBeNull();
    expect(screen.getByRole('button', {name: 'Save 13/C3'})).toBeEnabled();
  });

  it('offers Forget token from the form when GitHub rejects the token', async () => {
    const onForgetToken = vi.fn();
    const {user} = renderPanel({view: MKB_READY, promos: promosProps({controller: controllerOf(addForm({error: REJECTED})), onForgetToken})});
    await user.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it("points a Core reprint's Sets 1 to 8 copy to its Core copy", () => {
    renderPanel({view: {status: 'ready', rows: [], catalog: FIXTURE_CATALOG}, promos: promosProps({coreCopy: {id: '2026', name: 'Ursula - Deceiver (Set 9 #90)'}})});
    expect(screen.getByText(/Its promos are filed under its Core printing, Ursula - Deceiver \(Set 9 #90\): add and edit them there\./)).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Open the Core printing'})).toHaveAttribute('href', '/studio?mode=edit&card=2026');
    expect(addButton()).toBeNull();
  });

  it("shows a landed publish's outcome under the rows", () => {
    const outcome = {result: {commitUrl: COMMIT_URL}, error: null, note: LANDED_NOTE};
    renderPanel({view: MKB_READY, promos: promosProps({controller: controllerOf(null, {outcome})})});
    const line = screen.getByRole('status');
    expect(line).toHaveTextContent(`Committed. View commit. ${LANDED_NOTE}`);
    expect(within(line).getByRole('link', {name: 'View commit'})).toHaveAttribute('href', COMMIT_URL);
    expect(follows(screen.getByRole('list'), line)).toBe(true);
    // Another printing can be added at once.
    expect(follows(addButton()!, line)).toBe(true);
  });

  it('keeps the line for the last publish mounted, blank, under an open add form', () => {
    const {update} = renderPanel({view: MKB_READY, promos: promosProps({controller: controllerOf(addForm())})});
    const form = screen.getByRole('region', {name: 'New printing of Mother Knows Best'});
    // The form has a status line of its own: the panel's is the one in [data-outcome].
    const line = document.querySelector('[data-outcome] [role="status"]');
    expect(line).not.toBeNull();
    expect(line).toBeEmptyDOMElement();
    expect(follows(form, line!)).toBe(true);

    // A landed add fills the live region that was there, so a screen reader hears it.
    const outcome = {result: {commitUrl: COMMIT_URL}, error: null, note: LANDED_NOTE};
    update({promos: promosProps({controller: controllerOf(null, {outcome})})});
    expect(screen.getByRole('status')).toBe(line);
    expect(line).toHaveTextContent(`Committed. View commit. ${LANDED_NOTE}`);
  });

  it("keeps a landed publish's outcome in view when the read after it fails", () => {
    const outcome = {result: {commitUrl: COMMIT_URL}, error: null, note: LANDED_NOTE};
    renderPanel({view: {status: 'error', error: FAILED, retry: () => {}}, promos: promosProps({controller: controllerOf(null, {outcome})})});
    const retry = screen.getByRole('button', {name: 'Read the files again'});
    const line = screen.getByRole('status');
    expect(line).toHaveTextContent(`Committed. View commit. ${LANDED_NOTE}`);
    expect(within(line).getByRole('link', {name: 'View commit'})).toHaveAttribute('href', COMMIT_URL);
    expect(follows(retry, line)).toBe(true);
  });

  it('shows a refusal that closed the form under the rows, as an alert', () => {
    renderPanel({view: MKB_READY, promos: promosProps({controller: controllerOf(null, {outcome: {result: null, error: GONE, note: ''}})})});
    expect(screen.getByRole('alert')).toHaveTextContent(GONE);
    expect(follows(screen.getByRole('list'), screen.getByRole('alert'))).toBe(true);
  });
});

/*
 * A read of the branch's files that GitHub refused the token for (a 401) fails again with that token, so the failed
 * view offers Forget token under "Read the files again", as the search does for previewCards.json (R-26, #74). It
 * comes with the panel's promos, as the forms' does.
 */
describe('PrintingsPanel: a read GitHub refused the token for (#74)', () => {
  const REJECTED_READ = 'GitHub 401 on apps/web/public/data/collection/4.json: {"message":"Bad credentials"}';
  const readAgain = () => screen.getByRole('button', {name: 'Read the files again'});
  const forgetToken = () => screen.queryByRole('button', {name: 'Forget token'});

  it('offers Forget token where GitHub rejected the token on the read', async () => {
    const onForgetToken = vi.fn();
    const {user} = renderPanel({view: {status: 'error', error: REJECTED_READ, retry: vi.fn()}, promos: promosProps({onForgetToken})});
    expect(screen.getByRole('alert')).toHaveTextContent(REJECTED_READ);
    const forget = screen.getByRole('button', {name: 'Forget token'});
    // Under the retry, which the panel's handoff still lands on (R-48).
    expect(follows(readAgain(), forget)).toBe(true);

    await user.click(forget);
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it('offers no Forget token for another read failure', () => {
    renderPanel({view: {status: 'error', error: FAILED, retry: vi.fn()}, promos: promosProps()});
    expect(readAgain()).toBeInTheDocument();
    expect(forgetToken()).toBeNull();
  });

  it('offers no Forget token without the promos that bring it', () => {
    renderPanel({view: {status: 'error', error: REJECTED_READ, retry: vi.fn()}});
    expect(readAgain()).toBeInTheDocument();
    expect(forgetToken()).toBeNull();
  });
});

/*
 * Each form opens in place of the button that opened it, which hides while it is open, and Cancel
 * takes the form away with its own button. A publish that lands, or that the branch refuses because the
 * printing is gone, closes the form too. So the panel hands the focus on each time (R-48): to the form
 * that opened, back to the button that opened it on Cancel (or to Add a printing, for an edit form whose
 * row a read dropped: the form sat in Add's place), or to the line under the rows that says what came of
 * the publish. These run the panel on the studio's own controller.
 */
describe('PrintingsPanel: the focus as printing forms open and close (#77, R-48)', () => {
  /** The panel on the studio's controller for Mother Knows Best; its view stays as given. */
  function LivePanel({view, coreCopy = null}: {view: BranchPrintings; coreCopy?: PromoPrintingsProps['coreCopy']}) {
    const controller = usePrintingForm({token: 't', cardId: '2035'});
    return <PrintingsPanel view={view} changes={[]} onChoose={() => {}} promos={promosProps({controller, coreCopy})} />;
  }

  function renderLive(view: BranchPrintings = MKB_READY) {
    render(routed(<LivePanel view={view} />));
    return userEvent.setup();
  }

  const heading = (name: string) => screen.getByRole('heading', {level: 3, name});
  const edit13 = () => screen.getByRole('button', {name: 'Edit Mother Knows Best 13/C3'});

  it('hands the focus to the add form it opens, and back to Add a printing on Cancel', async () => {
    const user = renderLive();
    await user.click(addButton()!);
    await waitFor(() => expect(heading('New printing of Mother Knows Best')).toHaveFocus());

    await user.click(screen.getByRole('button', {name: 'Cancel'}));
    expect(screen.queryByRole('heading', {level: 3})).toBeNull();
    await waitFor(() => expect(addButton()).toHaveFocus());
  });

  it("hands the focus to the edit form it opens, and back to that row's Edit on Cancel", async () => {
    const user = renderLive();
    await user.click(edit13());
    await waitFor(() => expect(heading('Edit 13/C3 · id 80024')).toHaveFocus());

    await user.click(screen.getByRole('button', {name: 'Cancel'}));
    await waitFor(() => expect(edit13()).toHaveFocus());
  });

  it('hands the focus to the line under the rows once a publish lands', async () => {
    stubRepo({files: FIXTURE_FILES});
    const user = renderLive();
    await user.click(addButton()!);
    await user.selectOptions(screen.getByLabelText('Promo set'), 'P4');
    await user.type(screen.getByLabelText('Number'), '9');
    await user.click(within(screen.getByRole('group', {name: 'Versions of the new printing'})).getByRole('button', {name: 'Foil only'}));
    await user.upload(screen.getByLabelText('Click or drop to add the scan'), pngFile('scan.png'));
    const publish = screen.getByRole('button', {name: 'Publish 9/P4'});
    await waitFor(() => expect(publish).toBeEnabled());

    await user.click(publish);
    const line = await screen.findByText('Committed.', {exact: false});
    expect(screen.queryByRole('heading', {level: 3})).toBeNull();
    await waitFor(() => expect(line).toHaveFocus());
    expect(line).toHaveAttribute('role', 'status');
    expect(addButton()).toBeInTheDocument();
  });

  it('hands the focus to the failure under the rows when the branch no longer has the printing', async () => {
    stubRepo({files: filesFor(WITHOUT_13_C3)});
    const user = renderLive();
    await user.click(edit13());
    await user.type(screen.getByLabelText('Add a note'), 'Foil twin of 1/C3.');
    await user.click(screen.getByRole('button', {name: 'Save 13/C3'}));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(GONE);
    expect(screen.queryByRole('heading', {level: 3})).toBeNull();
    await waitFor(() => expect(alert.parentElement).toHaveFocus());
    expect(editNames()).toEqual(['Edit Mother Knows Best 1/C3', 'Edit Mother Knows Best 13/C3']);
  });

  it('leaves the focus where it is when it is not where the press left it', () => {
    renderLive();
    const elsewhere = document.body.appendChild(document.createElement('input'));
    elsewhere.focus();
    // fireEvent presses the button without moving the focus to it, so the focus is on the input, not on <body>.
    fireEvent.click(addButton()!);
    expect(heading('New printing of Mother Knows Best')).toBeInTheDocument();
    expect(elsewhere).toHaveFocus();
    elsewhere.remove();
  });

  it('hands the focus on Add a printing to "Read the files again" when the read after a publish fails', () => {
    const {update} = renderPanel({view: {...MKB_READY, refreshing: true}, promos: promosProps()});
    act(() => addButton()!.focus());
    update({view: {status: 'error', error: FAILED, retry: () => {}}});
    expect(screen.getByRole('button', {name: 'Read the files again'})).toHaveFocus();
  });

  /*
   * The rows come from collection/promos.json and an edit form's printing from the catalog, so on a branch
   * whose files are out of step a read can drop the row of the printing an open form edits. The form stays
   * open under the rows, where Add a printing sits, so its Cancel is still there.
   */
  /** Mother Knows Best's rows once a read of the branch lost 13/C3, which the catalog still has. */
  const WITHOUT_ROW_13: BranchPrintings = {...MKB_READY, rows: [MKB_99, MKB_1_C3]};
  const edit13Form = () => controllerOf(editForm({id: 80024, card: MKB_BASE}));

  it('keeps an edit form open under the list when a read drops its row, and its heading takes the focus that was in it', () => {
    const rows = [MKB_99, MKB_1_C3, {...MKB_13_C3, thumbnail: ART}];
    const {update} = renderPanel({view: {...MKB_READY, rows}, promos: promosProps({controller: edit13Form()})});
    act(() => screen.getByLabelText('Number').focus());

    update({view: WITHOUT_ROW_13});
    const form = screen.getByRole('region', {name: 'Edit 13/C3 · id 80024'});
    expect(within(screen.getByRole('list')).queryByRole('region')).toBeNull();
    expect(follows(screen.getByRole('list'), form)).toBe(true);
    // Where Add a printing would be, over the line for the last publish, and with no row's art to show.
    expect(follows(form, document.querySelector('[data-outcome]')!)).toBe(true);
    expect(form.querySelector('img')).toBeNull();
    expect(screen.getByRole('button', {name: 'Cancel'})).toBeEnabled();
    expect(heading('Edit 13/C3 · id 80024')).toHaveFocus();
  });

  it('hands the focus that was in a moved edit form to its failure, where it has one (R-59, #84)', () => {
    const failing = controllerOf(editForm({id: 80024, card: MKB_BASE, error: GONE}));
    const {update} = renderPanel({view: MKB_READY, promos: promosProps({controller: failing})});
    act(() => screen.getByLabelText('Number').focus());

    update({view: WITHOUT_ROW_13});
    const form = screen.getByRole('region', {name: 'Edit 13/C3 · id 80024'});
    expect(within(form).getByRole('alert').parentElement).toHaveFocus();
  });

  it('leaves a focus that was on <body> before a read moved an edit form, rather than give it to the form (#84)', () => {
    const {update} = renderPanel({view: MKB_READY, promos: promosProps({controller: edit13Form()})});
    act(() => (document.activeElement as HTMLElement | null)?.blur());
    expect(document.body).toHaveFocus();

    update({view: WITHOUT_ROW_13});
    expect(screen.getByRole('region', {name: 'Edit 13/C3 · id 80024'})).toBeInTheDocument();
    expect(document.body).toHaveFocus();
  });

  it('leaves the focus where it was when a read drops the row of an edit form it was not in', () => {
    const {update} = renderPanel({view: MKB_READY, promos: promosProps({controller: edit13Form()})});
    const both = within(versionsOf(MKB_99)).getByRole('button', {name: 'Both'});
    act(() => both.focus());

    update({view: WITHOUT_ROW_13});
    expect(screen.getByRole('region', {name: 'Edit 13/C3 · id 80024'})).toBeInTheDocument();
    expect(both).toHaveFocus();
  });

  it('hands the focus to Add a printing on Cancel of an edit form whose row went, since the form sat in its place', async () => {
    const user = userEvent.setup();
    const {rerender} = render(routed(<LivePanel view={MKB_READY} />));
    await user.click(edit13());
    await waitFor(() => expect(heading('Edit 13/C3 · id 80024')).toHaveFocus());
    rerender(routed(<LivePanel view={WITHOUT_ROW_13} />));

    await user.click(screen.getByRole('button', {name: 'Cancel'}));
    expect(screen.queryByRole('heading', {level: 3})).toBeNull();
    // No row's Edit opens 13/C3 now: Add a printing, which the form took the place of, takes the focus back.
    await waitFor(() => expect(addButton()).toHaveFocus());
  });

  it("keeps an edit form whose row went open on a Core copy, and gives its Cancel's focus to the Core copy's link", async () => {
    const coreCopy = {id: '2026', name: 'Ursula - Deceiver (Set 9 #90)'};
    const user = userEvent.setup();
    const {rerender} = render(routed(<LivePanel view={MKB_READY} coreCopy={coreCopy} />));
    await user.click(edit13());
    rerender(routed(<LivePanel view={WITHOUT_ROW_13} coreCopy={coreCopy} />));

    // The form keeps its place, where the Core copy's note would be, with its Cancel.
    expect(screen.getByRole('region', {name: 'Edit 13/C3 · id 80024'})).toBeInTheDocument();
    expect(screen.queryByRole('link', {name: 'Open the Core printing'})).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Cancel'}));
    // The note is back, and its link takes the focus, as Add a printing would on a card that offers one.
    await waitFor(() => expect(screen.getByRole('link', {name: 'Open the Core printing'})).toHaveFocus());
  });

  it('says what a Core copy\'s stranded edit form published, under the note, and hands the focus to that line', async () => {
    stubRepo({files: FIXTURE_FILES});
    const coreCopy = {id: '2026', name: 'Ursula - Deceiver (Set 9 #90)'};
    const user = userEvent.setup();
    const {rerender} = render(routed(<LivePanel view={MKB_READY} coreCopy={coreCopy} />));
    await user.click(edit13());
    rerender(routed(<LivePanel view={WITHOUT_ROW_13} coreCopy={coreCopy} />));
    await user.type(screen.getByLabelText('Add a note'), 'Foil twin of 1/C3.');

    await user.click(screen.getByRole('button', {name: 'Save 13/C3'}));
    const line = await screen.findByText('Committed.', {exact: false});
    expect(screen.queryByRole('heading', {level: 3})).toBeNull();
    expect(screen.getByRole('link', {name: 'Open the Core printing'})).toBeInTheDocument();
    await waitFor(() => expect(line).toHaveFocus());
    expect(line).toHaveAttribute('role', 'status');
  });

  it('puts the edit form back under its row when a read brings the row back, its heading taking the focus that was in it', () => {
    const {update} = renderPanel({view: WITHOUT_ROW_13, promos: promosProps({controller: edit13Form()})});
    act(() => screen.getByLabelText('Number').focus());

    update({view: MKB_READY});
    expect(within(itemOf(MKB_13_C3).nextElementSibling as HTMLElement).getByRole('region', {name: 'Edit 13/C3 · id 80024'})).toBeInTheDocument();
    expect(heading('Edit 13/C3 · id 80024')).toHaveFocus();
  });

  it('hands the focus to the Printings heading once "Read the files again" lands, though an edit form comes back with the rows', async () => {
    const failed: BranchPrintings = {status: 'error', error: FAILED, retry: () => {}};
    const {user, land} = renderReading(failed, promosProps({controller: edit13Form()}));
    await user.click(screen.getByRole('button', {name: 'Read the files again'}));

    land(MKB_READY);
    expect(screen.getByRole('region', {name: 'Edit 13/C3 · id 80024'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'Printings'})).toHaveFocus();
  });
});
