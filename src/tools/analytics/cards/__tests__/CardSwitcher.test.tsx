import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {SWITCHER_CARDS} from '../cardFixtures';
import {CardSwitcher} from '../CardSwitcher';

type User = ReturnType<typeof userEvent.setup>;

/**
 * The switcher on the card page's route, as R3-7 mounts it in the header: one
 * route element serves every id, so a pick navigates and the switcher stays.
 */
function renderSwitcher(cards: LorcanaCard[] = SWITCHER_CARDS) {
  const router = createMemoryRouter([{path: '/cards/:cardId?', element: <CardSwitcher cards={cards} />}], {
    initialEntries: ['/cards'],
  });
  render(<RouterProvider router={router} />);
  return {router, user: userEvent.setup(), input: screen.getByRole('combobox', {name: 'Switch card'})};
}

/** Types into the field, then waits out the hook's 150 ms debounce for the list. */
async function openList(user: User, input: HTMLElement, query: string) {
  await user.type(input, query);
  return screen.findAllByRole('option');
}

const optionTexts = () => screen.getAllByRole('option').map((option) => option.textContent);

/** Longer than the hook's 150 ms debounce, so a list that was going to open has. */
const pastTheDebounce = () => new Promise((resolve) => setTimeout(resolve, 200));

describe('CardSwitcher', () => {
  it('is a named combobox that starts collapsed', () => {
    const {input} = renderSwitcher();
    expect(input).toHaveAttribute('placeholder', 'Switch card…');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('waits for two letters', async () => {
    const {user, input} = renderSwitcher();
    await user.type(input, 'm');
    await pastTheDebounce();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.type(input, 'i');
    expect(await screen.findByRole('listbox', {name: 'Cards'})).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('lists up to 6 cards, newest set first: "name · version" and the collector number', async () => {
    const {user, input} = renderSwitcher();
    await openList(user, input, 'mi');
    // Eight cards match. Set 11 comes first, and Madam Mim and Magic Mirror (set 10) are cut.
    expect(optionTexts()).toEqual([
      'Miss Bianca · Unwavering Agent',
      'Mickey Mouse · Wayward Sorcerer #40',
      'Minnie Mouse · Musketeer Champion #120',
      'Mickey Mouse · Brave Little Tailor #115',
      'Minnie Mouse · Beloved Princess #12',
      'Mirabel Madrigal · Gift of the Family #18',
    ]);
    // A popover, not a dialog: nothing traps focus.
    expect(document.querySelector('[aria-modal]')).toBeNull();
  });

  it.each([
    ['a card with no version as its bare name', 'mirror', ['Magic Mirror #66']],
    ['a card with no collector number without one', 'bianca', ['Miss Bianca · Unwavering Agent']],
  ])('shows %s', async (_, query, texts) => {
    const {user, input} = renderSwitcher();
    await openList(user, input, query);
    expect(optionTexts()).toEqual(texts);
  });

  it("shows both of a dual-ink card's inks", async () => {
    const {user, input} = renderSwitcher();
    const [option] = await openList(user, input, 'musketeer');
    // The icons are decorative: the option's name is its text alone.
    expect(option.querySelectorAll('img[alt=""][aria-hidden="true"]')).toHaveLength(2);
    expect(option).toHaveAccessibleName('Minnie Mouse · Musketeer Champion #120');
  });

  it('highlights an option from the keys and the pointer alike', async () => {
    const {user, input} = renderSwitcher();
    const options = await openList(user, input, 'mi');
    await user.keyboard('{ArrowDown}');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    // The class is what paints the highlight: AdminStyles reads aria-selected on it.
    expect(options[0]).toHaveClass('adm-option');
    await user.hover(options[2]);
    expect(options[2]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('opens the highlighted card on Enter, empties the field and keeps focus in it', async () => {
    const {router, user, input} = renderSwitcher();
    await openList(user, input, 'mi');
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(router.state.location.pathname).toBe('/cards/3006'));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens a clicked card, and keeps focus in the field', async () => {
    const {router, user, input} = renderSwitcher();
    await openList(user, input, 'mi');
    await user.click(screen.getByRole('option', {name: 'Mickey Mouse · Brave Little Tailor #115'}));
    await waitFor(() => expect(router.state.location.pathname).toBe('/cards/3001'));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  it('closes on Escape and keeps the text', async () => {
    const {user, input} = renderSwitcher();
    await openList(user, input, 'mi');
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveValue('mi');
    // Cards still match the text, so there's nothing to report.
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  describe('"No cards match."', () => {
    it('is said politely as soon as the text finds no card', async () => {
      const {user, input} = renderSwitcher();
      await user.type(input, 'zq');
      expect(screen.getByRole('status')).toHaveTextContent('No cards match.');
    });

    it('waits for the open list to close, so it never shows beside stale results', async () => {
      const {user, input} = renderSwitcher();
      await openList(user, input, 'mi');
      await user.type(input, 'x');
      // "mix" finds nothing, but the list still shows "mi" for up to 150 ms, and the status waits.
      // Checked only while the list is up: on a loaded machine the 150 ms may already have passed.
      if (screen.queryByRole('listbox')) expect(screen.getByRole('status')).toBeEmptyDOMElement();
      await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
      expect(screen.getByRole('status')).toHaveTextContent('No cards match.');
    });

    it('goes once focus leaves the field', async () => {
      const {user, input} = renderSwitcher();
      await user.type(input, 'zq');
      expect(screen.getByRole('status')).toHaveTextContent('No cards match.');
      await user.tab();
      // After the hook's 150 ms blur delay, as the list would close.
      await waitFor(() => expect(screen.getByRole('status')).toBeEmptyDOMElement());
    });

    it('is never said while the card list is empty (loading, or failed)', async () => {
      const {user, input} = renderSwitcher([]);
      await user.type(input, 'zq');
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });
  });
});
