import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {CardName} from '../tools/analytics/CardName';
import {ImagePage} from '../tools/image/ImagePage';
import {AdminShell} from './AdminShell';

// The pages read a card list that holds one card, 2983; the rest of the bridge
// stays real. CardDataProvider still mounts, and its own load never settles.
vi.mock('../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../app-bridge')>()),
  useCardDataContext: () => ({cards: [], getCardById: (id: string) => (id === '2983' ? {id} : undefined)}),
}));

/** A page that prints two card names: one the card list holds, one it doesn't. */
function NamesPage() {
  return (
    <p>
      <CardName id="2983" name="Elsa - Snow Queen" /> and <CardName id="17" name="Anna - Heir to Arendelle" />
    </p>
  );
}

function renderShellAt(path: string) {
  const routes = [
    {
      element: <AdminShell />,
      children: [
        {path: 'image', element: <ImagePage />},
        {path: 'names', element: <NamesPage />},
      ],
    },
  ];
  render(<RouterProvider router={createMemoryRouter(routes, {initialEntries: [path]})} />);
}

beforeEach(() => {
  // The card data load never settles; the tests are about the token and the card links.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
  localStorage.setItem('inkweave.reveal-admin.gh-token', 'tok');
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('AdminShell', () => {
  it('forgets the token from the sidebar, which sends the page back to its gate', async () => {
    renderShellAt('/image');
    const sidebar = within(screen.getByRole('complementary', {name: 'Admin sidebar'}));
    expect(sidebar.getByText('GitHub token saved')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Save token'})).not.toBeInTheDocument();

    await userEvent.click(sidebar.getByRole('button', {name: 'Forget token'}));

    expect(screen.getByRole('button', {name: 'Save token'})).toBeInTheDocument();
    expect(sidebar.queryByText('GitHub token saved')).not.toBeInTheDocument();
  });

  it('links a card name on any page to its card page, but only a card the card list holds (R-33)', () => {
    renderShellAt('/names');
    expect(screen.getByRole('link', {name: 'Elsa - Snow Queen'})).toHaveAttribute('href', '/cards/2983');
    expect(screen.queryByRole('link', {name: 'Anna - Heir to Arendelle'})).not.toBeInTheDocument();
    expect(screen.getByText(/and Anna - Heir to Arendelle$/)).toBeInTheDocument();
  });
});
