import {render, screen, waitFor, waitForElementToBeRemoved, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {createMemoryRouter, Link, RouterProvider} from 'react-router-dom';
import {UnsavedChangesGuard} from './UnsavedChangesGuard';

const MESSAGE = "2 pending tuning edits aren't published yet. Leaving this page drops them.";

/** A page with an "Unsaved edits" switch and a link away, guarded as R2-6's page is. */
function Editor() {
  const [dirty, setDirty] = useState(false);
  return (
    <>
      <h1>Editor</h1>
      <label>
        <input type="checkbox" checked={dirty} onChange={(e) => setDirty(e.target.checked)} />
        Unsaved edits
      </label>
      <Link to="/elsewhere">Elsewhere</Link>
      <UnsavedChangesGuard dirty={dirty} message={MESSAGE} />
    </>
  );
}

function renderEditor() {
  const router = createMemoryRouter(
    [
      {path: '/editor', element: <Editor />},
      {path: '/elsewhere', element: <h1>Elsewhere</h1>},
    ],
    {initialEntries: ['/editor']},
  );
  render(<RouterProvider router={router} />);
  return {router, user: userEvent.setup()};
}

/** Stages an edit, then follows the link away, which the guard holds. */
async function tryToLeave(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('checkbox', {name: 'Unsaved edits'}));
  await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
  return screen.findByRole('dialog', {name: 'Leave this page?'});
}

describe('UnsavedChangesGuard', () => {
  it('asks nothing while there is nothing to lose', async () => {
    const {router, user} = renderEditor();
    await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
    expect(await screen.findByRole('heading', {name: 'Elsewhere'})).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it('asks in a modal dialog before a link leaves unsaved edits, and focuses what leaving loses', async () => {
    const {router, user} = renderEditor();
    const dialog = await tryToLeave(user);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('heading', {level: 2, name: 'Leave this page?'})).toBeInTheDocument();
    // A screen reader hears the message first, and no single key press leaves.
    await waitFor(() => expect(within(dialog).getByText(MESSAGE)).toHaveFocus());
    expect(router.state.location.pathname).toBe('/editor');
    await user.tab();
    expect(within(dialog).getByRole('button', {name: 'Stay on this page'})).toHaveFocus();
  });

  it('stays on the page with its edits, and hands focus back to the link', async () => {
    const {router, user} = renderEditor();
    const dialog = await tryToLeave(user);
    await user.click(within(dialog).getByRole('button', {name: 'Stay on this page'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.pathname).toBe('/editor');
    expect(screen.getByRole('checkbox', {name: 'Unsaved edits'})).toBeChecked();
    expect(screen.getByRole('link', {name: 'Elsewhere'})).toHaveFocus();
  });

  it('stays on Escape', async () => {
    const {router, user} = renderEditor();
    await tryToLeave(user);
    await user.keyboard('{Escape}');
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.pathname).toBe('/editor');
  });

  it('leaves when asked to', async () => {
    const {router, user} = renderEditor();
    const dialog = await tryToLeave(user);
    await user.click(within(dialog).getByRole('button', {name: 'Leave this page'}));
    expect(await screen.findByRole('heading', {name: 'Elsewhere'})).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/elsewhere');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
