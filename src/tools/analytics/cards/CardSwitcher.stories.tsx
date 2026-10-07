import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {userEvent, within} from 'storybook/test';
import {SPACING} from '../../../app-bridge';
import {SWITCHER_CARDS} from './cardFixtures';
import {CardSwitcher} from './CardSwitcher';

const meta: Meta<typeof CardSwitcher> = {
  title: 'Admin/Insights/Card analytics/Switcher',
  component: CardSwitcher,
  args: {cards: SWITCHER_CARDS},
  // At the header's right edge, on the card page's route: a pick navigates.
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/cards']}>
        <div style={{display: 'flex', justifyContent: 'flex-end', padding: SPACING.xxxl}}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** As the header shows it. */
export const Closed: Story = {};

/**
 * "mi" typed and the first result highlighted: six of the eight matches, newest
 * set first, with a dual-ink card, a card with no collector number, and the
 * highlight's row fill and bar. Click the canvas and the list closes; type again
 * to reopen it.
 */
export const Open: Story = {
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('combobox', {name: 'Switch card'}), 'mi');
    await canvas.findAllByRole('option');
    await userEvent.keyboard('{ArrowDown}');
  },
};

/** Text that finds no card: the polite status where the list would be. */
export const NoMatch: Story = {
  play: async ({canvasElement}) => {
    await userEvent.type(within(canvasElement).getByRole('combobox', {name: 'Switch card'}), 'zq');
  },
};
