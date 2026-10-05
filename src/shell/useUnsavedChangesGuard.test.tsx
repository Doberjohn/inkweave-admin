import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {createMemoryRouter, Link, RouterProvider} from 'react-router-dom';
import {useUnsavedChangesGuard, type LeavesPage} from './useUnsavedChangesGuard';

/** A page with an "Unsaved edits" switch, links away and to itself, and the guard's answer buttons. */
function Editor({leaves}: {leaves?: LeavesPage}) {
  const [dirty, setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty, leaves);
  return (
    <>
      <h1>Editor</h1>
      <label>
        <input type="checkbox" checked={dirty} onChange={(e) => setDirty(e.target.checked)} />
        Unsaved edits
      </label>
      <Link to="/elsewhere">Elsewhere</Link>
      <Link to="/editor?rule=ramp">Ramp</Link>
      {guard.blocked && (
        <>
          <p>Held</p>
          <button type="button" onClick={guard.stay}>
            Stay
          </button>
          <button type="button" onClick={guard.leave}>
            Leave
          </button>
        </>
      )}
    </>
  );
}

/** useBlocker needs a data router, so the page renders in createMemoryRouter, as the app's createBrowserRouter. */
function renderEditor(initialEntries = ['/editor'], leaves?: LeavesPage) {
  const router = createMemoryRouter(
    [
      {path: '/editor', element: <Editor leaves={leaves} />},
      {path: '/elsewhere', element: <h1>Elsewhere</h1>},
    ],
    {initialEntries, initialIndex: initialEntries.length - 1},
  );
  const view = render(<RouterProvider router={router} />);
  return {router, unmount: view.unmount, user: userEvent.setup()};
}

/** Fires the event a tab close or reload sends, and says whether the page asked to stay. */
function unloadPrevented() {
  const event = new Event('beforeunload', {cancelable: true});
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

const editsSwitch = () => screen.getByRole('checkbox', {name: 'Unsaved edits'});

describe('useUnsavedChangesGuard', () => {
  it('lets a navigation through while there is nothing to lose', async () => {
    const {router, user} = renderEditor();
    await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
    expect(await screen.findByRole('heading', {name: 'Elsewhere'})).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it('holds a link to another page while there are unsaved edits', async () => {
    const {router, user} = renderEditor();
    await user.click(editsSwitch());
    await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
    expect(await screen.findByText('Held')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/editor');
  });

  it('stays, edits and all, when asked to', async () => {
    const {router, user} = renderEditor();
    await user.click(editsSwitch());
    await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
    await user.click(await screen.findByRole('button', {name: 'Stay'}));
    expect(screen.queryByText('Held')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/editor');
    expect(editsSwitch()).toBeChecked();
  });

  it('carries on to the held page when asked to leave', async () => {
    const {router, user} = renderEditor();
    await user.click(editsSwitch());
    await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
    await user.click(await screen.findByRole('button', {name: 'Leave'}));
    expect(await screen.findByRole('heading', {name: 'Elsewhere'})).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it("never holds a change to the same page's search, such as ?rule=", async () => {
    const {router, user} = renderEditor();
    await user.click(editsSwitch());
    await user.click(screen.getByRole('link', {name: 'Ramp'}));
    expect(router.state.location.search).toBe('?rule=ramp');
    expect(screen.queryByText('Held')).not.toBeInTheDocument();
    // The page stayed mounted, so its edits did too.
    expect(editsSwitch()).toBeChecked();
  });

  it('holds a search change too when the page says that leaves (R4: another card)', async () => {
    const {router, user} = renderEditor(['/editor'], (from, to) => from.pathname !== to.pathname || from.search !== to.search);
    await user.click(editsSwitch());
    await user.click(screen.getByRole('link', {name: 'Ramp'}));
    expect(await screen.findByText('Held')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it("holds the browser's Back too, and goes back once asked to leave", async () => {
    const {router, user} = renderEditor(['/elsewhere', '/editor']);
    await user.click(editsSwitch());
    await act(() => router.navigate(-1));
    expect(await screen.findByText('Held')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/editor');
    await user.click(screen.getByRole('button', {name: 'Leave'}));
    expect(await screen.findByRole('heading', {name: 'Elsewhere'})).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it('drops a hold once the edits clear, and does not raise it again', async () => {
    const {router, user} = renderEditor();
    await user.click(editsSwitch());
    await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
    expect(await screen.findByText('Held')).toBeInTheDocument();
    // A publish that lands while the question is open clears the edits.
    await user.click(editsSwitch());
    expect(screen.queryByText('Held')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/editor');
    // New edits don't bring back the old navigation.
    await user.click(editsSwitch());
    expect(screen.queryByText('Held')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/editor');
  });

  it('asks the browser to confirm a tab close or reload only while there are unsaved edits', async () => {
    const {user, unmount} = renderEditor();
    expect(unloadPrevented()).toBe(false);
    await user.click(editsSwitch());
    expect(unloadPrevented()).toBe(true);
    await user.click(editsSwitch());
    expect(unloadPrevented()).toBe(false);
    await user.click(editsSwitch());
    unmount();
    expect(unloadPrevented()).toBe(false);
  });
});
