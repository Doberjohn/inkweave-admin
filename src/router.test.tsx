import {render, screen, within} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {routes} from './router';
import {ADMIN_TOOLS} from './shell/tools';

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, {initialEntries: [path]})} />);
}

beforeEach(() => {
  // The shell's CardDataProvider loads the card data on mount. These tests only
  // check routing, so that fetch never settles.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('admin routes', () => {
  it('shows the tool index at /', () => {
    renderAt('/');
    expect(screen.getByRole('heading', {level: 1, name: 'Tools'})).toBeInTheDocument();
  });

  it('shows a not-found message for any other path', () => {
    renderAt('/admin/reveal');
    expect(screen.getByRole('heading', {level: 1, name: 'Not found'})).toBeInTheDocument();
  });

  it('links every tool from the shell navigation', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', {name: 'Admin tools'});
    for (const tool of ADMIN_TOOLS) {
      expect(within(nav).getByRole('link', {name: tool.name})).toHaveAttribute('href', tool.path);
    }
  });

  it("marks a tool's link current on any of its pages", () => {
    renderAt('/banner/1970');
    const nav = screen.getByRole('navigation', {name: 'Admin tools'});
    expect(within(nav).getByRole('link', {name: 'Banner generator'})).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', {name: 'Analytics'})).not.toHaveAttribute('aria-current');
  });

  it('names the branch the tools write to', () => {
    renderAt('/');
    expect(screen.getByText('master')).toBeInTheDocument();
  });

  it('names a rehearsal branch when one is set', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    renderAt('/');
    expect(screen.getByText('admin-verify')).toBeInTheDocument();
  });

  it.each([
    ['/reveal', 'Reveal admin'],
    ['/image', 'Card image admin'],
    ['/tuning', 'Tuning admin'],
  ])('asks for a GitHub token before %s', (path, title) => {
    renderAt(path);
    expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
  });

  it('opens analytics at /analytics', () => {
    renderAt('/analytics');
    expect(screen.getByRole('heading', {level: 1, name: 'Engine Calibration'})).toBeInTheDocument();
  });

  it('opens a card banner at /banner/:cardId', () => {
    renderAt('/banner/2983');
    expect(screen.getByText('Loading banner…')).toBeInTheDocument();
  });
});
