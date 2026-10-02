import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {TuningPage} from '../tools/tuning/TuningPage';
import {AdminShell} from './AdminShell';

function renderShellAt(path: string) {
  const routes = [{element: <AdminShell />, children: [{path: 'tuning', element: <TuningPage />}]}];
  render(<RouterProvider router={createMemoryRouter(routes, {initialEntries: [path]})} />);
}

beforeEach(() => {
  // The card data and tuning.json loads never settle; the test is about the token.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
  localStorage.setItem('inkweave.reveal-admin.gh-token', 'tok');
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('AdminShell', () => {
  it('forgets the token from the sidebar, which sends the page back to its gate', async () => {
    renderShellAt('/tuning');
    const sidebar = within(screen.getByRole('complementary', {name: 'Admin sidebar'}));
    expect(sidebar.getByText('GitHub token saved')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Save token'})).not.toBeInTheDocument();

    await userEvent.click(sidebar.getByRole('button', {name: 'Forget token'}));

    expect(screen.getByRole('button', {name: 'Save token'})).toBeInTheDocument();
    expect(sidebar.queryByText('GitHub token saved')).not.toBeInTheDocument();
  });
});
