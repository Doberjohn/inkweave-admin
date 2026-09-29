import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider, useLocation} from 'react-router-dom';
import {ToolIndex} from './ToolIndex';
import {ADMIN_TOOLS} from './tools';

function CurrentPath() {
  return <p>at {useLocation().pathname}</p>;
}

function renderIndex() {
  const router = createMemoryRouter([
    {path: '/', element: <ToolIndex />},
    {path: '*', element: <CurrentPath />},
  ]);
  render(<RouterProvider router={router} />);
}

describe('ToolIndex', () => {
  it('lists every admin tool by name', () => {
    renderIndex();
    for (const tool of ADMIN_TOOLS) {
      expect(screen.getByRole('heading', {name: tool.name})).toBeInTheDocument();
    }
  });

  it.each(ADMIN_TOOLS.map((tool) => [tool.name, tool.path]))('opens %s at %s', async (name, path) => {
    renderIndex();
    await userEvent.click(screen.getByRole('button', {name: `Open ${name}`}));
    expect(screen.getByText(`at ${path}`)).toBeInTheDocument();
  });
});
