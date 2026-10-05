import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {SIDEBAR_OPEN_KEY, Sidebar} from './Sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'Admin/Sidebar',
  component: Sidebar,
  args: {tokenSaved: false, onForgetToken: () => {}},
  // Each story opens with the sidebar's default state (open), not whatever an
  // earlier story or a click on the toggle saved.
  beforeEach: () => localStorage.removeItem(SIDEBAR_OPEN_KEY),
  // Full height at the shell's left edge, on the page named by parameters.route.
  decorators: [
    (Story, {parameters}) => (
      <MemoryRouter initialEntries={[parameters.route ?? '/activity']}>
        <div style={{display: 'flex', height: '100vh'}}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** A read-only page: no token box, whatever the token. */
export const Open: Story = {};

/** A page that writes, with a token saved: the token box sits above the toggle. */
export const WritePageWithToken: Story = {
  args: {tokenSaved: true},
  parameters: {route: '/reveal'},
};

/** Collapsed: marks only. Each link keeps its full name as its accessible name and tooltip. */
export const Collapsed: Story = {
  args: {tokenSaved: true},
  parameters: {route: '/calibration'},
  beforeEach: () => localStorage.setItem(SIDEBAR_OPEN_KEY, 'false'),
};
