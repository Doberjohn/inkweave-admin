import {createRef, useImperativeHandle, useState, type Ref} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PrintingsPanel, type PrintingsPanelProps} from '../components/PrintingsPanel';
import {
  NUMBER_223_TO_BOTH,
  NUMBER_223_TO_BOTH_CLASHED,
  NUMBER_59_TO_FOIL,
  YEN_SID_ROWS,
} from '../finishes/__tests__/finishFixtures';
import type {PrintingRow} from '../finishes/printingRows';
import type {BranchPrintings} from '../finishes/useBranchPrintings';

/** Yen Sid's #59 (Both, by rarity), his Enchanted #209 (Foil, by rarity) and his alt foil #223 (Foil, in the data). */
const [NUMBER_59, ENCHANTED_209, ALT_FOIL_223] = YEN_SID_ROWS;

const READY: BranchPrintings = {status: 'ready', rows: YEN_SID_ROWS};
const LOADING: BranchPrintings = {status: 'loading'};
const FAILED = 'GitHub 404 on apps/web/public/data/collection/4.json: Not Found';

/**
 * The panel on Yen Sid's rows with nothing staged, unless the test says otherwise. `onChoose` records
 * what it is told, and `update` renders the panel again with some props changed, as the page does
 * when the files land or the batch changes: the props it leaves out stay as they were.
 */
function renderPanel(first: Partial<PrintingsPanelProps> = {}) {
  const onChoose = vi.fn();
  let props: PrintingsPanelProps = {view: READY, changes: [], onChoose, ...first};
  const rendered = render(<PrintingsPanel {...props} />);
  const update = (next: Partial<PrintingsPanelProps>) => {
    props = {...props, ...next};
    rendered.rerender(<PrintingsPanel {...props} />);
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
 */
function ReadingPanel({first, ref}: {first: BranchPrintings; ref: Ref<Reading>}) {
  const [view, setView] = useState(first);
  useImperativeHandle(ref, () => ({land: setView}), []);
  const retry = () => setView(LOADING);
  return <PrintingsPanel view={view.status === 'error' ? {...view, retry} : view} changes={[]} onChoose={vi.fn()} />;
}

function renderReading(first: BranchPrintings) {
  const reading = createRef<Reading>();
  render(<ReadingPanel first={first} ref={reading} />);
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
    const group = screen.getByRole('group', {name: 'Versions of Yen Sid - Powerful Sorcerer #223'});
    expect(within(group).getByRole('button', {name: 'Foil only'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('By rarity')).toHaveLength(2);
    expect(screen.getByText('In the data')).toBeInTheDocument();
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
    expect(within(itemOf(NUMBER_59)).getByText('By rarity')).toBeInTheDocument();
    expect(within(itemOf(ENCHANTED_209)).getByText('By rarity')).toBeInTheDocument();
    expect(within(itemOf(ALT_FOIL_223)).getByText('In the data')).toBeInTheDocument();
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
    expect(within(row).getByText('Pending')).toBeInTheDocument();
    // It is the row's one marker: it no longer says where the old versions came from.
    expect(within(row).queryByText('In the data')).not.toBeInTheDocument();
    // The other rows are as they were.
    expect(pressedIn(NUMBER_59)).toEqual(['Both']);
    expect(screen.getAllByText('Pending')).toHaveLength(1);
  });

  it('shows each pending row with the versions its change writes', () => {
    renderPanel({changes: [NUMBER_59_TO_FOIL, NUMBER_223_TO_BOTH]});
    expect(pressedIn(NUMBER_59)).toEqual(['Foil only']);
    expect(pressedIn(ALT_FOIL_223)).toEqual(['Both']);
    expect(pressedIn(ENCHANTED_209)).toEqual(['Foil only']);
    expect(screen.getAllByText('Pending')).toHaveLength(2);
    expect(within(itemOf(ENCHANTED_209)).getByText('By rarity')).toBeInTheDocument();
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
    expect(within(row).getByText('Clash')).toBeInTheDocument();
    expect(within(row).queryByText('Pending')).not.toBeInTheDocument();
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
