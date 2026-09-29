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
});
