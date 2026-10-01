import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {routes} from './router';
import {NAV_ITEMS} from './shell/nav';

function renderAt(path: string) {
  return render(<RouterProvider router={createMemoryRouter(routes, {initialEntries: [path]})} />);
}

const sidebarNav = () => within(screen.getByRole('navigation', {name: 'Admin'}));
const WRITE_PATHS = NAV_ITEMS.filter((item) => item.writes).map((item) => item.path);

beforeEach(() => {
  // The shell's CardDataProvider loads the card data on mount, and the
  // analytics page its artifacts. These tests only check routing, so those
  // fetches never settle.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe('admin routes', () => {
  it('sends / to analytics until the Overview exists', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', {level: 1, name: 'Engine Calibration'})).toBeInTheDocument();
    expect(sidebarNav().getByRole('link', {name: 'Analytics'})).toHaveAttribute('aria-current', 'page');
  });

  it('links every page from the sidebar', () => {
    renderAt('/analytics');
    for (const item of NAV_ITEMS) {
      expect(sidebarNav().getByRole('link', {name: item.label})).toHaveAttribute('href', item.path);
    }
  });

  it("marks only the current page's link", () => {
    renderAt('/tuning');
    expect(sidebarNav().getByRole('link', {name: 'Engine tuning'})).toHaveAttribute('aria-current', 'page');
    expect(sidebarNav().getByRole('link', {name: 'Analytics'})).not.toHaveAttribute('aria-current');
  });

  it.each(WRITE_PATHS)('names the branch %s writes to', (path) => {
    renderAt(path);
    expect(screen.getByText('Writes to Doberjohn/inkweave')).toHaveTextContent('Writes to Doberjohn/inkweave master');
  });

  it('names a rehearsal branch when one is set', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    renderAt('/reveal');
    expect(screen.getByText('admin-verify')).toBeInTheDocument();
  });

  it.each(['/analytics', '/no-such-page'])('names no branch on %s, which writes nothing', (path) => {
    renderAt(path);
    expect(screen.queryByText('Writes to Doberjohn/inkweave')).not.toBeInTheDocument();
  });

  it('shows a not-found page for any other path', () => {
    renderAt('/admin/reveal');
    expect(screen.getByRole('heading', {level: 1, name: 'Not found'})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Back to Overview'})).toHaveAttribute('href', '/');
  });

  it.each([
    ['/reveal', 'Reveal admin'],
    ['/image', 'Card image admin'],
    ['/tuning', 'Tuning admin'],
  ])('asks for a GitHub token before %s', (path, title) => {
    renderAt(path);
    expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
  });

  it('keeps the sidebar collapsed across reloads', async () => {
    const first = renderAt('/analytics');
    await userEvent.click(screen.getByRole('button', {name: 'Collapse sidebar'}));
    first.unmount();

    renderAt('/analytics');
    expect(screen.getByRole('button', {name: 'Expand sidebar'})).toHaveAttribute('aria-expanded', 'false');
    expect(sidebarNav().getByRole('link', {name: 'Analytics'})).toHaveAttribute('title', 'Analytics');
  });
});
